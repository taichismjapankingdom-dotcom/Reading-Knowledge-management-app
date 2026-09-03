import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import localforage from 'localforage';

const CACHE_KEY = 'premium_entitlements';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export const useEntitlement = (feature) => {
  const [hasEntitlement, setHasEntitlement] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    
    const checkEntitlement = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (isMounted) {
            setHasEntitlement(false);
            setLoading(false);
          }
          return;
        }

        // Check cache first
        const cached = await localforage.getItem(CACHE_KEY);
        if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
          if (isMounted) {
            setHasEntitlement(evaluateFeature(cached.status, feature));
            setLoading(false);
          }
          return;
        }

        // 1. Fetch Authoritative Entitlement State from Database Resolver
        const { data: isPremium, error } = await supabase.rpc('my_premium_access');
        
        let status = (!error && isPremium) ? 'active' : 'free';

        // DEVELOPMENT ONLY: Mock active subscription if 'mock_premium' is set
        // This is strictly stripped or inert in production environments.
        if (import.meta.env.DEV && localStorage.getItem('mock_premium') === 'true') {
          status = 'active';
        }

        // Cache the combined authoritative result
        await localforage.setItem(CACHE_KEY, { status, timestamp: Date.now() });

        if (isMounted) {
          setHasEntitlement(evaluateFeature(status, feature));
          setLoading(false);
        }
      } catch (err) {
        console.error('Error checking entitlement:', err);
        if (isMounted) {
          setHasEntitlement(false);
          setLoading(false);
        }
      }
    };
    
    checkEntitlement();
    
    return () => { isMounted = false; };
  }, [feature]);
  
  return { hasEntitlement, loading };
};

// Evaluates whether a given resolved status unlocks a specific feature
function evaluateFeature(status, feature) {
  // Free tier features
  if (['spotify_connection', 'youtube_embed'].includes(feature)) {
    return true; // Everyone gets these
  }
  
  // Premium features
  const isPremium = ['active', 'trialing'].includes(status);
  
  const premiumFeatures = [
    'unlimited_books', 
    'unlimited_searches', 
    'automatic_synopsis',
    'ai_note_assistant',
    'ai_quiz',
    'ai_dictionary',
    'conversational_search'
  ];
  
  if (premiumFeatures.includes(feature)) {
    return isPremium;
  }
  
  return false;
}
