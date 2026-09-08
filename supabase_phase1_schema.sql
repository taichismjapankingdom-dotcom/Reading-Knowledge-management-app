-- ==============================================================================
-- PHASE 1 SCHEMA MIGRATION: FREE LIMITS ENFORCEMENT (REVISED V4)
-- Please run this script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. BOOK REGISTRATION LIMIT (30 books for Free tier)
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Safe current-user helper to check book limit without recursive RLS
-- Uses transaction-scoped advisory locks to ensure concurrent inserts are serialized
CREATE OR REPLACE FUNCTION public.can_current_user_upsert_book(
  target_book_id UUID,
  proposed_deleted_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_uid UUID;
  is_premium BOOLEAN;
  existing_deleted_at TIMESTAMPTZ;
  active_books_count INT;
BEGIN
  -- Derive user completely safely and internally
  current_uid := auth.uid();
  IF current_uid IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Check premium status using canonical resolver
  is_premium := public.check_premium_access(current_uid);
  
  IF is_premium THEN
    RETURN true;
  END IF;

  -- 2. Concurrency Control: Acquire transaction-scoped advisory lock for this specific user.
  -- Uses 64-bit hashtextextended to avoid the smaller 32-bit keyspace collisions.
  -- The lock will automatically release when the calling transaction commits/rolls back.
  PERFORM pg_advisory_xact_lock(hashtextextended(current_uid::text, 0));

  -- 3. Tombstone check: If the proposed state is soft-deleted, it doesn't increase the active count.
  IF proposed_deleted_at IS NOT NULL THEN
    RETURN true;
  END IF;

  -- 4. Evaluate whether this UPSERT modifies an already-existing active row
  SELECT deleted_at INTO existing_deleted_at
  FROM public.books
  WHERE id = target_book_id AND user_id = current_uid;

  IF FOUND THEN
    -- If the book exists and is ALREADY active, updating it doesn't increase the active count.
    IF existing_deleted_at IS NULL THEN
      RETURN true;
    END IF;
  END IF;

  -- 5. Count active books safely bypassing RLS for this specific count
  -- Reaching here means this operation creates a new active book OR restores a soft-deleted one.
  SELECT count(*)
  INTO active_books_count
  FROM public.books
  WHERE user_id = current_uid
    AND deleted_at IS NULL;

  -- 6. Return true if under limit
  RETURN active_books_count < 30;
END;
$$;

-- Secure the helper
REVOKE ALL ON FUNCTION public.can_current_user_upsert_book(UUID, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_current_user_upsert_book(UUID, TIMESTAMPTZ) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_current_user_upsert_book(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_current_user_upsert_book(UUID, TIMESTAMPTZ) TO service_role;

-- Enforce via RLS
-- We use an AS RESTRICTIVE policy to cleanly layer the 30-book constraint
-- on top of whatever existing permissive INSERT policies the application uses.
-- This guarantees we do not accidentally break existing sync or permissions.
DROP POLICY IF EXISTS "Enforce Free tier book limit" ON public.books;
CREATE POLICY "Enforce Free tier book limit"
ON public.books
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_current_user_upsert_book(id, deleted_at)
);

-- Note: We preserve the standard UPDATE policy. Free users can edit/delete their books.
-- Postgres RLS processes an ON CONFLICT DO UPDATE by testing the INSERT policy on the 
-- proposed row. If it passes and conflicts, the UPDATE policy handles the updated row.


-- 2. SEARCH QUOTA CONSUMPTION RPC
-- Called securely by the search-books Edge Function to enforce the 10/day limit.
CREATE OR REPLACE FUNCTION public.consume_search_quota(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium BOOLEAN;
  today DATE := (now() AT TIME ZONE 'utc')::date; -- Explicit UTC Accounting
  current_usage INT;
BEGIN
  is_premium := public.check_premium_access(target_user_id);
  
  IF is_premium THEN
    RETURN true;
  END IF;

  -- Atomic quota check and increment for Free tier.
  -- The WHERE clause ensures we DO NOT increment if they are already at or past the limit,
  -- keeping the count clamped at exactly 10 for blocked users.
  INSERT INTO public.usage_daily (user_id, feature, model, day, count)
  VALUES (target_user_id, 'book_search', 'none', today, 1)
  ON CONFLICT (user_id, feature, model, day)
  DO UPDATE SET count = usage_daily.count + 1
  WHERE usage_daily.count < 10
  RETURNING count INTO current_usage;

  -- If current_usage is NULL, it means the row existed but the WHERE clause failed
  -- (meaning they were already at the limit and the update was skipped).
  IF current_usage IS NULL THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Strict Server-only access.
REVOKE ALL ON FUNCTION public.consume_search_quota(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_search_quota(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.consume_search_quota(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_search_quota(UUID) TO service_role;

-- Refund RPC for provider failures
CREATE OR REPLACE FUNCTION public.refund_search_quota(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today DATE := (now() AT TIME ZONE 'utc')::date; -- Explicit UTC Accounting
BEGIN
  -- We don't refund Premium users since they aren't tracked/blocked anyway.
  IF public.check_premium_access(target_user_id) THEN
    RETURN;
  END IF;

  UPDATE public.usage_daily
  SET count = GREATEST(0, count - 1)
  WHERE user_id = target_user_id AND feature = 'book_search' AND model = 'none' AND day = today;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_search_quota(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_search_quota(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.refund_search_quota(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refund_search_quota(UUID) TO service_role;


-- 3. REDEMPTION RATE LIMITER
CREATE TABLE IF NOT EXISTS public.redemption_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  attempts INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.redemption_rate_limits ENABLE ROW LEVEL SECURITY;
-- No client policies. Completely locked down to service_role.

CREATE OR REPLACE FUNCTION public.check_redemption_rate_limit(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_attempts INT;
  current_window_start TIMESTAMPTZ;
  max_attempts CONSTANT INT := 5;
  window_duration CONSTANT INTERVAL := '15 minutes';
BEGIN
  -- Upsert with atomic check
  INSERT INTO public.redemption_rate_limits (user_id, attempts, window_start)
  VALUES (target_user_id, 1, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    attempts = CASE 
      WHEN now() - public.redemption_rate_limits.window_start > window_duration THEN 1
      ELSE public.redemption_rate_limits.attempts + 1
    END,
    window_start = CASE 
      WHEN now() - public.redemption_rate_limits.window_start > window_duration THEN now()
      ELSE public.redemption_rate_limits.window_start
    END
  RETURNING attempts, window_start INTO current_attempts, current_window_start;

  IF current_attempts > max_attempts THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_redemption_rate_limit(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_redemption_rate_limit(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.check_redemption_rate_limit(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_redemption_rate_limit(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.clear_redemption_rate_limit(target_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.redemption_rate_limits WHERE user_id = target_user_id;
$$;

REVOKE ALL ON FUNCTION public.clear_redemption_rate_limit(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_redemption_rate_limit(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.clear_redemption_rate_limit(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.clear_redemption_rate_limit(UUID) TO service_role;
