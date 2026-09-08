import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fetchJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
  return res.json();
};

const fetchText = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
  return res.text();
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

    // Get securely verified user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { query, isbn } = body;
    if (!query && !isbn) {
      return new Response(JSON.stringify({ error: 'Missing query or isbn' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Quota Check (Server-side Authoritative via Service Role)
    const { data: quotaCheck, error: quotaError } = await supabaseAdmin.rpc('consume_search_quota', { target_user_id: user.id });
    if (quotaError) {
      console.error('Quota check failed:', quotaError);
      return new Response(JSON.stringify({ error: 'Internal server error during quota check' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    if (!quotaCheck) {
      return new Response(JSON.stringify({ error: 'Search limit reached. Please upgrade to Premium.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Perform Searches
    let googleRes = null;
    let openLibRes = null;
    let providerError = false;

    try {
      if (isbn) {
        const cleanIsbn = isbn.replace(/-/g, '');
        const [google, openLib] = await Promise.allSettled([
          fetchJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`),
          fetchJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&jscmd=data&format=json`)
        ]);
        
        if (google.status === 'rejected' && openLib.status === 'rejected') {
          providerError = true;
        }

        googleRes = google.status === 'fulfilled' ? google.value : null;
        openLibRes = openLib.status === 'fulfilled' ? openLib.value : null;
      } else {
        const google = await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40`).catch(() => null);
        
        if (!google) {
          providerError = true;
        }

        googleRes = google;
      }

      if (providerError) {
        throw new Error('All metadata providers returned HTTP errors or network failures.');
      }

      return new Response(JSON.stringify({ googleRes, openLibRes }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (fetchErr) {
      console.error('Provider fetch failed comprehensively, refunding quota:', fetchErr);
      await supabaseAdmin.rpc('refund_search_quota', { target_user_id: user.id });
      
      return new Response(JSON.stringify({ error: 'Search providers are currently unavailable. Please try again later.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Unexpected Edge Function Error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
