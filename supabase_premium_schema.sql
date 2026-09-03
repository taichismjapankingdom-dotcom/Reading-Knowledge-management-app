-- ==============================================================================
-- PREMIUM FEATURES SCHEMA MIGRATION (Phase 0 - Hardened + Complimentary Access)
-- Please run this script in your Supabase SQL Editor.
-- ==============================================================================

-- Ensure pgcrypto is enabled for secure code hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  provider TEXT, -- e.g., 'stripe', 'apple', 'google'
  provider_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'free', -- 'free', 'trialing', 'active', 'past_due', 'canceled', 'expired'
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription" 
  ON public.subscriptions FOR SELECT 
  USING (auth.uid() = user_id);
-- No public policies for INSERT/UPDATE/DELETE (reserved for backend webhooks)


-- 2. USAGE METRICS TABLE
CREATE TABLE IF NOT EXISTS public.usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL, 
  model TEXT NOT NULL DEFAULT 'none', -- Supports distinguished AI models or 'none' for basic features
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT DEFAULT 0 CHECK (count >= 0),
  tokens_input INT DEFAULT 0 CHECK (tokens_input >= 0),
  tokens_output INT DEFAULT 0 CHECK (tokens_output >= 0),
  UNIQUE(user_id, feature, model, day)
);

ALTER TABLE public.usage_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own usage" ON public.usage_daily;
CREATE POLICY "Users can view their own usage" 
  ON public.usage_daily FOR SELECT 
  USING (auth.uid() = user_id);
-- Backend (Edge Functions) handles insertions/updates, so no public write policies.


-- 3. QUIZ TABLES
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  question_count INT CHECK (question_count >= 0),
  score INT CHECK (score >= 0),
  mode TEXT
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  type TEXT,
  question TEXT,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  source_reference TEXT
);

-- Enable RLS and setup idempotent policies
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- quiz_sessions policies
DROP POLICY IF EXISTS "Users can view their own quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can view their own quiz sessions" 
  ON public.quiz_sessions FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can insert their own quiz sessions" 
  ON public.quiz_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can update their own quiz sessions" 
  ON public.quiz_sessions FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can delete their own quiz sessions" 
  ON public.quiz_sessions FOR DELETE 
  USING (auth.uid() = user_id);

-- quiz_questions policies (derive access from session)
DROP POLICY IF EXISTS "Users can view their own quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can view their own quiz questions"
  ON public.quiz_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.quiz_sessions qs WHERE qs.id = session_id AND qs.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can insert their own quiz questions"
  ON public.quiz_questions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_sessions qs WHERE qs.id = session_id AND qs.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can update their own quiz questions"
  ON public.quiz_questions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.quiz_sessions qs WHERE qs.id = session_id AND qs.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_sessions qs WHERE qs.id = session_id AND qs.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can delete their own quiz questions"
  ON public.quiz_questions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.quiz_sessions qs WHERE qs.id = session_id AND qs.user_id = auth.uid()));


-- 4. USER MEDIA TABLE (YouTube/Spotify)
CREATE TABLE IF NOT EXISTS public.user_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, 
  external_id TEXT,
  url TEXT,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own media" ON public.user_media;
CREATE POLICY "Users can manage their own media" 
  ON public.user_media FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 5. BOOKS TABLE EXTENSIONS
-- Add synopsis fields safely (Idempotent single ADD COLUMN statements)
ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS synopsis TEXT,
    ADD COLUMN IF NOT EXISTS synopsis_source TEXT,
    ADD COLUMN IF NOT EXISTS synopsis_generated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS synopsis_language TEXT,
    ADD COLUMN IF NOT EXISTS synopsis_model TEXT,
    ADD COLUMN IF NOT EXISTS synopsis_source_url TEXT;


-- 6. COMPLIMENTARY ACCESS CODES
CREATE TABLE IF NOT EXISTS public.premium_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE, -- SHA256 hex string to securely verify codes
  label TEXT, -- Non-secret administrative label (e.g., 'Family', 'Beta Testers')
  type TEXT NOT NULL DEFAULT 'single_use',
  max_redemptions INT NOT NULL DEFAULT 1 CHECK (max_redemptions > 0),
  current_redemptions INT NOT NULL DEFAULT 0 CHECK (current_redemptions >= 0 AND current_redemptions <= max_redemptions),
  grant_duration_days INT CHECK (grant_duration_days > 0), -- NULL means non-expiring/lifetime access
  redeemable_until TIMESTAMPTZ, -- The deadline by which the code must be entered
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.premium_access_codes ENABLE ROW LEVEL SECURITY;
-- No public policies! Ordinary users cannot SELECT, INSERT, UPDATE, or DELETE from this table.


-- 7. COMPLIMENTARY GRANTS (REDEMPTIONS)
CREATE TABLE IF NOT EXISTS public.premium_access_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code_id UUID REFERENCES public.premium_access_codes(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, code_id) -- A user can only redeem a specific code once
);

ALTER TABLE public.premium_access_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own redemptions" ON public.premium_access_redemptions;
CREATE POLICY "Users can view their own redemptions" 
  ON public.premium_access_redemptions FOR SELECT 
  USING (auth.uid() = user_id);
-- No public INSERT/UPDATE/DELETE. Handled securely via RPC below.


-- 8. CANONICAL ENTITLEment RESOLVER
-- Server-side authoritative truth for Premium status
CREATE OR REPLACE FUNCTION public.check_premium_access(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Check active/trialing paid subscription (respecting expiration if present)
  IF EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = target_user_id 
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) THEN
    RETURN true;
  END IF;

  -- 2. Check valid complimentary grants
  IF EXISTS (
    SELECT 1 FROM public.premium_access_redemptions 
    WHERE user_id = target_user_id 
      AND is_revoked = false 
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Secure arbitrary user checks: prevent public/authenticated clients from checking others
REVOKE ALL ON FUNCTION public.check_premium_access(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_premium_access(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.check_premium_access(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_premium_access(UUID) TO service_role;

-- Authenticated wrapper for frontend UI checking (users checking themselves)
CREATE OR REPLACE FUNCTION public.my_premium_access()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.check_premium_access(auth.uid());
$$;

-- Prevent unauthenticated calls
REVOKE ALL ON FUNCTION public.my_premium_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_premium_access() FROM anon;
GRANT EXECUTE ON FUNCTION public.my_premium_access() TO authenticated;

-- 9. ATOMIC REDEMPTION RPC (Strictly for Service Role via Edge Functions)
CREATE OR REPLACE FUNCTION public.redeem_premium_code(target_user_id UUID, plaintext_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS to allow querying the locked-down access_codes table safely
SET search_path = public
AS $$
DECLARE
  target_code RECORD;
  computed_hash TEXT;
  new_expires_at TIMESTAMPTZ;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Hash the incoming plaintext code (SHA256) so we never compare plaintext in the DB
  computed_hash := encode(digest(plaintext_code, 'sha256'), 'hex');

  -- Find matching active code and LOCK IT to prevent concurrent over-redemption race conditions
  SELECT * INTO target_code 
  FROM premium_access_codes 
  WHERE code_hash = computed_hash
    AND is_active = true 
    AND (redeemable_until IS NULL OR redeemable_until > now())
    AND current_redemptions < max_redemptions
  FOR UPDATE; 

  IF NOT FOUND THEN
    -- Generic failure response hides existence, expiration, or capacity details from attackers
    RETURN json_build_object('success', false, 'error', 'This Premium access code is invalid or unavailable.');
  END IF;

  -- Check if already redeemed by this specific user
  IF EXISTS (SELECT 1 FROM premium_access_redemptions WHERE user_id = target_user_id AND code_id = target_code.id) THEN
    RETURN json_build_object('success', false, 'error', 'This Premium access code is invalid or unavailable.');
  END IF;

  -- Calculate grant expiration date
  IF target_code.grant_duration_days IS NOT NULL THEN
    new_expires_at := now() + (target_code.grant_duration_days || ' days')::interval;
  ELSE
    new_expires_at := NULL;
  END IF;

  -- Atomic increment of the redemption counter
  UPDATE premium_access_codes 
  SET current_redemptions = current_redemptions + 1 
  WHERE id = target_code.id;

  -- Insert the user's new entitlement grant
  INSERT INTO premium_access_redemptions (user_id, code_id, expires_at)
  VALUES (target_user_id, target_code.id, new_expires_at);

  RETURN json_build_object('success', true, 'expires_at', new_expires_at);
END;
$$;

-- SECURE REDEMPTION EXECUTION: Prevent browser bypass of Edge Function rate limiters
REVOKE ALL ON FUNCTION public.redeem_premium_code(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_premium_code(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.redeem_premium_code(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_premium_code(UUID, TEXT) TO service_role;
