-- ==============================================================================
-- PHASE 1 SCHEMA MIGRATION: FREE LIMITS ENFORCEMENT
-- Please run this script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. BOOK REGISTRATION LIMIT (30 books for Free tier)
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Enforce via RLS so clients cannot bypass it.
DROP POLICY IF EXISTS "Users can insert their own books" ON public.books;
CREATE POLICY "Users can insert their own books"
ON public.books
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (
    public.check_premium_access(auth.uid()) = true
    OR 
    (SELECT count(*) FROM public.books WHERE user_id = auth.uid() AND deleted_at IS NULL) < 30
  )
);

-- Note: The UPDATE policy remains unaffected, so Free users can still edit/delete their 30 books.
-- We ensure the UPDATE policy exists and is secure.
DROP POLICY IF EXISTS "Users can update their own books" ON public.books;
CREATE POLICY "Users can update their own books"
ON public.books
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 2. SEARCH QUOTA CONSUMPTION RPC
-- Called securely by the search-books Edge Function to enforce the 10/day limit.
CREATE OR REPLACE FUNCTION public.consume_search_quota()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium BOOLEAN;
  today DATE := CURRENT_DATE; -- Deterministic UTC day
  current_usage INT;
BEGIN
  is_premium := public.check_premium_access(auth.uid());
  
  IF is_premium THEN
    RETURN true;
  END IF;

  -- Atomic quota check and increment for Free tier
  INSERT INTO public.usage_daily (user_id, feature, model, day, count)
  VALUES (auth.uid(), 'book_search', 'none', today, 1)
  ON CONFLICT (user_id, feature, model, day)
  DO UPDATE SET count = usage_daily.count + 1
  RETURNING count INTO current_usage;

  IF current_usage > 10 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- The Edge Function invokes this using the user's JWT, so authenticated users CAN call this RPC.
-- However, since the browser is no longer directly calling Google APIs, modifying JS to bypass
-- this RPC just breaks the Edge Function call, stopping the search anyway.
REVOKE ALL ON FUNCTION public.consume_search_quota() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_search_quota() FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_search_quota() TO authenticated;
