import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In a real production system, this could be Redis. For Phase 1 we use an in-memory map
// because Edge Function isolates might stay warm for multiple requests.
// A more robust rate limiting would use a dedicated DB table, but this prevents simple script-kiddie spam.
const rateLimits = new Map<string, { attempts: number, lastAttempt: number }>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      throw new Error('Code is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // Basic Rate Limiting: 5 attempts per 15 minutes per user
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; 
    const maxAttempts = 5;
    
    const userLimits = rateLimits.get(user.id) || { attempts: 0, lastAttempt: now };
    
    if (now - userLimits.lastAttempt > windowMs) {
      userLimits.attempts = 0; // reset window
    }
    
    if (userLimits.attempts >= maxAttempts) {
      // Still update the timestamp to push back the window if they keep trying
      userLimits.lastAttempt = now;
      rateLimits.set(user.id, userLimits);
      return new Response(JSON.stringify({ error: 'Too many redemption attempts. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    userLimits.attempts += 1;
    userLimits.lastAttempt = now;
    rateLimits.set(user.id, userLimits);

    // Call the privileged RPC using SERVICE_ROLE
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error: rpcError } = await supabaseAdmin.rpc('redeem_premium_code', {
      target_user_id: user.id,
      plaintext_code: code.trim()
    });

    if (rpcError) throw rpcError;

    // If successful, reset their rate limit so they aren't punished for success
    if (data && data.success) {
      rateLimits.delete(user.id);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
