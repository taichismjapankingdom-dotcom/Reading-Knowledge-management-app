import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEntitlement } from '../../hooks/useEntitlement';
import { Sparkles, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import localforage from 'localforage';

export default function PremiumSettings() {
  const { t } = useTranslation();
  const { hasEntitlement: isPremium, loading } = useEntitlement('unlimited_books');
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState(null);

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setRedeeming(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('redeem-code', {
        body: { code: code.trim() }
      });

      if (error) {
        let extractedError = t('premium.invalid_code', 'This Premium access code is invalid or unavailable.');
        // Safely extract the JSON body if this is a FunctionsHttpError
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errData = await error.context.json();
            if (errData?.error) extractedError = errData.error;
          } catch (jsonErr) {}
        } else if (error.message && !error.message.includes('non-2xx')) {
          extractedError = error.message;
        }
        throw new Error(extractedError);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || t('premium.invalid_code', 'This Premium access code is invalid or unavailable.'));
      }

      setMessage({ type: 'success', text: t('premium.redeem_success', 'Code successfully redeemed! You now have Premium access.') });
      setCode('');
      
      // Clear the stale entitlement cache before reloading
      await localforage.removeItem('premium_entitlements');

      // Slight delay to allow backend changes to settle, then reload to refresh entitlements globally
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || t('premium.invalid_code', 'This Premium access code is invalid or unavailable.') });
    } finally {
      setRedeeming(false);
    }
  };

  const openUpgradeModal = () => {
    window.dispatchEvent(new Event('open_upgrade_modal'));
  };

  return (
    <section className="settings-section glass-panel">
      <h2>{t('premium.title', 'Premium & Subscription')}</h2>
      
      <div className="setting-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              {t('premium.current_plan', 'Current Plan')}: 
              {loading ? (
                <span style={{ opacity: 0.5 }}>...</span>
              ) : isPremium ? (
                <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={16} /> Premium</span>
              ) : (
                <span>Free</span>
              )}
            </h3>
          </div>
          {!isPremium && !loading && (
            <button className="primary-btn" onClick={openUpgradeModal} style={{ margin: 0, padding: '8px 16px', whiteSpace: 'nowrap' }}>
              {t('premium.upgrade_btn', 'Upgrade to Premium')}
            </button>
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Key size={16} /> {t('premium.redeem_title', 'Complimentary Access')}
        </label>
        <p className="setting-hint">{t('premium.redeem_hint', 'Enter an access code to unlock Premium features.')}</p>
        
        <form onSubmit={handleRedeem} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('premium.code_placeholder', 'Enter code')}
            className="glass-input"
            style={{ flex: '1 1 200px' }}
            disabled={redeeming}
          />
          <button type="submit" className="glass-btn primary" disabled={redeeming || !code.trim()} style={{ whiteSpace: 'nowrap' }}>
            {redeeming ? t('premium.redeeming', 'Redeeming...') : t('premium.redeem_btn', 'Redeem')}
          </button>
        </form>

        {message && (
          <div style={{ 
            marginTop: '12px', 
            padding: '12px', 
            borderRadius: '6px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: message.type === 'success' ? '#4ade80' : '#f87171'
          }}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: '0.9rem' }}>{message.text}</span>
          </div>
        )}
      </div>
    </section>
  );
}
