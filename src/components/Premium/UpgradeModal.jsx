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
                <h4>Unlimited Library</h4>
                <p>Register unlimited books and use advanced metadata searches.</p>
              </div>
            </div>
            
            <div className="feature-item">
              <BrainCircuit size={24} />
              <div>
                <h4>AI Reading Companion</h4>
                <p>Organize notes, generate quizzes, and use the AI dictionary.</p>
              </div>
            </div>

            <div className="feature-item">
              <Headphones size={24} />
              <div>
                <h4>Reading Soundtracks</h4>
                <p>Embed YouTube playlists to create your ideal focus environment.</p>
              </div>
            </div>
          </div>

          <div className="upgrade-actions">
            {!isMockPremium ? (
              <button className="primary-btn upgrade-cta-btn" onClick={handleMockUpgrade}>
                Try Premium (Mock Developer Mode)
              </button>
            ) : (
              <button className="glass-btn downgrade-btn" onClick={handleMockDowngrade}>
                Revert to Free (Mock Developer Mode)
              </button>
            )}
            <p className="billing-terms">Cancel anytime. Billed annually.</p>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
