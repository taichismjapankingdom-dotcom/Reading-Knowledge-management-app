import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const body = await req.json().catch(() => ({}));
    const { code } = body;
    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'Code is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check Persistent Rate Limit (5 attempts / 15 minutes)
    const { data: isAllowed, error: rateLimitError } = await supabaseAdmin.rpc('check_redemption_rate_limit', {
      target_user_id: user.id
    });
    
    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Too many redemption attempts. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Call the privileged RPC using SERVICE_ROLE
    const { data, error: rpcError } = await supabaseAdmin.rpc('redeem_premium_code', {
      target_user_id: user.id,
      plaintext_code: code.trim()
    });

    if (rpcError || (data && data.success === false)) {
      if (rpcError) console.error('Redemption RPC threw error:', rpcError);
      
      // Deliberately generic error message so clients cannot differentiate
      // between exhausted, expired, or non-existent codes to prevent enumeration.
      return new Response(JSON.stringify({ error: 'This Premium access code is invalid or unavailable.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. If successful, reset their rate limit so they aren't punished for success
    if (data && data.success) {
      await supabaseAdmin.rpc('clear_redemption_rate_limit', { target_user_id: user.id });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected Edge Function Error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
