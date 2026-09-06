import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, BookOpen, BrainCircuit, Headphones } from 'lucide-react';
import './UpgradeModal.css';

export default function UpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open_upgrade_modal', handleOpen);
    return () => window.removeEventListener('open_upgrade_modal', handleOpen);
  }, []);

  if (!isOpen) return null;

  const handleMockUpgrade = () => {
    // For local testing Phase 0: set a mock localstorage flag and reload
    localStorage.setItem('mock_premium', 'true');
    window.location.reload();
  };

  const handleMockDowngrade = () => {
    localStorage.removeItem('mock_premium');
    window.location.reload();
  };

  const isMockPremium = localStorage.getItem('mock_premium') === 'true';

  return (
    <AnimatePresence>
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="upgrade-modal glass-panel"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          <button className="close-btn" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>

          <div className="upgrade-header">
            <Sparkles size={48} className="premium-accent-icon" />
            <h2>ReadMind Premium</h2>
            <p>Turn reading into retained knowledge.</p>
          </div>

          <div className="features-list">
            <div className="feature-item">
              <BookOpen size={24} />
              <div>
                <h4>{t('premium.feat_unlimited', 'Unlimited Books & Searches')}</h4>
                <p>{t('premium.feat_unlimited_desc', 'Register unlimited books and perform unlimited metadata searches.')}</p>
              </div>
            </div>
            
            <div className="feature-item">
              <BrainCircuit size={24} />
              <div>
                <h4>{t('premium.feat_ai', 'Advanced AI Suite')}</h4>
                <p>{t('premium.feat_ai_desc', 'AI Note Assistant, AI Quiz, Automatic Synopsis, AI Dictionary, and Conversational Web Search.')}</p>
              </div>
            </div>

            <div className="feature-item">
              <Headphones size={24} />
              <div>
                <h4>{t('premium.feat_media', 'Focus Media')}</h4>
                <p>{t('premium.feat_media_desc', 'Embed YouTube playlists directly into your reading environment for deep focus.')}</p>
              </div>
            </div>
          </div>

          <div className="upgrade-actions">
            {import.meta.env.DEV && (
              <div className="dev-mock-actions" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>DEVELOPMENT ONLY</p>
                {!isMockPremium ? (
                  <button className="primary-btn upgrade-cta-btn" onClick={handleMockUpgrade} style={{ marginBottom: 0 }}>
                    Try Premium (Mock)
                  </button>
                ) : (
                  <button className="glass-btn downgrade-btn" onClick={handleMockDowngrade} style={{ marginBottom: 0 }}>
                    Revert to Free (Mock)
                  </button>
                )}
              </div>
            )}
            
            {!import.meta.env.DEV && (
               <button className="primary-btn upgrade-cta-btn" disabled style={{ opacity: 0.7 }}>
                  {t('premium.upgrade_coming_soon', 'Premium Subscriptions Coming Soon')}
               </button>
            )}
            
            <p className="billing-terms">{t('premium.redeem_hint_modal', 'Have a complimentary access code? Redeem it in Settings.')}</p>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
