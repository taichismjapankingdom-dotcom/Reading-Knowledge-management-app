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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { query, isbn } = await req.json();
    if (!query && !isbn) {
      throw new Error('Missing query or isbn');
    }

    // 1. Quota Check (Server-side Authoritative)
    // We'll call a Postgres RPC that consumes quota and returns { allowed: boolean }
    const { data: quotaCheck, error: quotaError } = await supabaseClient.rpc('consume_search_quota');
    if (quotaError) throw quotaError;
    if (!quotaCheck) {
      return new Response(JSON.stringify({ error: 'Search limit reached. Please upgrade to Premium.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Perform Searches
    let googleRes = null;
    let openLibRes = null;
    let ndlXml = null;

    if (isbn) {
      const cleanIsbn = isbn.replace(/-/g, '');
      const [google, openLib, ndl] = await Promise.allSettled([
        fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`).then(r => r.json()),
        fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&jscmd=data&format=json`).then(r => r.json()),
        fetch(`https://ndlsearch.ndl.go.jp/api/opensearch?isbn=${cleanIsbn}`).then(r => r.text())
      ]);
      googleRes = google.status === 'fulfilled' ? google.value : null;
      openLibRes = openLib.status === 'fulfilled' ? openLib.value : null;
      ndlXml = ndl.status === 'fulfilled' ? ndl.value : null;
    } else {
      const [google, ndl] = await Promise.allSettled([
        fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40`).then(r => r.json()),
        fetch(`https://ndlsearch.ndl.go.jp/api/opensearch?title=${encodeURIComponent(query)}&cnt=40`).then(r => r.text())
      ]);
      googleRes = google.status === 'fulfilled' ? google.value : null;
      ndlXml = ndl.status === 'fulfilled' ? ndl.value : null;
    }

    return new Response(JSON.stringify({ googleRes, openLibRes, ndlXml }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
