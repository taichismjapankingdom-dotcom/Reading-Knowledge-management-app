-- ==============================================================================
-- PREMIUM CODES MIGRATION (Phase 2 - Account-Bound Codes Support)
-- Please run this script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Add the allocated_user_id column safely
ALTER TABLE public.premium_access_codes 
ADD COLUMN IF NOT EXISTS allocated_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Update the secure redemption RPC to enforce allocated_user_id
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
  computed_hash := encode(extensions.digest(plaintext_code, 'sha256'), 'hex');

  -- Find matching active code and LOCK IT to prevent concurrent over-redemption race conditions
  -- NOW WITH allocated_user_id protection (account-bound enforcement)
  SELECT * INTO target_code 
  FROM premium_access_codes 
  WHERE code_hash = computed_hash
    AND is_active = true 
    AND (redeemable_until IS NULL OR redeemable_until > now())
    AND current_redemptions < max_redemptions
    AND (allocated_user_id IS NULL OR allocated_user_id = target_user_id)
  FOR UPDATE; 

  IF NOT FOUND THEN
    -- Generic failure response hides existence, expiration, capacity, or account-binding details from attackers
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

-- Ensure secure execution permissions remain locked down
REVOKE ALL ON FUNCTION public.redeem_premium_code(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_premium_code(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.redeem_premium_code(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_premium_code(UUID, TEXT) TO service_role;
