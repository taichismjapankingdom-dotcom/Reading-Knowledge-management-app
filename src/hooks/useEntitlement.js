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

        // Fetch from Supabase subscriptions table
        const { data, error } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', session.user.id)
          .single();
          
        let status = 'free';
        if (!error && data) {
          status = data.status;
        } else if (error && error.code === 'PGRST116') {
          // No row found, means free user
          status = 'free';
        }

        // DEVELOPMENT ONLY: Mock active subscription if 'mock_premium' is set in localStorage
        if (localStorage.getItem('mock_premium') === 'true') {
          status = 'active';
        }

        // Cache the result
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

// Evaluates whether a given subscription status unlocks a specific feature
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
    'ai_dictionary'
  ];
  
  if (premiumFeatures.includes(feature)) {
    return isPremium;
  }
  
  return false;
}
