import React from 'react';
import { useTranslation } from 'react-i18next';
import { useEntitlement } from '../../hooks/useEntitlement';
import { Lock } from 'lucide-react';
import './PremiumGate.css';

export default function PremiumGate({ 
  feature, 
  children, 
  fallback = null, 
  showOverlay = false, 
  message = null 
}) {
  const { hasEntitlement, loading } = useEntitlement(feature);
  const { t } = useTranslation();

  if (loading) {
    return <div className="premium-gate-loading">Loading...</div>; // Could be a skeleton
  }

  if (hasEntitlement) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showOverlay) {
    return (
      <div className="premium-gate-overlay-container">
        <div className="premium-gate-blurred-content">
          {children}
        </div>
        <div className="premium-gate-overlay">
          <Lock size={32} className="premium-icon" />
          <h3>{t('premium.locked_title') || 'Premium Feature'}</h3>
          <p>{message || t('premium.locked_desc') || 'Upgrade to Premium to unlock this capability.'}</p>
          <button className="primary-btn premium-upgrade-btn" onClick={() => window.dispatchEvent(new Event('open_upgrade_modal'))}>
            {t('premium.upgrade_cta') || 'Upgrade Now'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
