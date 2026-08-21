import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/useSettingsStore';
import { useBooks } from '../hooks/useBooks';
import { Check } from 'lucide-react';
import { exportLibrary, importLibrary } from '../utils/dataTransfer';
import { supabase } from '../lib/supabase';
import './Settings.css';

const BACKGROUNDS = [
  { id: 'cozy', name: 'Cozy Room', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2069&auto=format&fit=crop' },
  { id: 'modern', name: 'Modern Study', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop' },
  { id: 'library', name: 'Library', url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2190&auto=format&fit=crop' },
  { id: 'nature', name: 'Nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071&auto=format&fit=crop' },
  { id: 'abstract', name: 'Abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop' }
];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { language, theme, background, noteTheme, setLanguage, setTheme, setBackground, setNoteTheme } = useSettingsStore();
  const { repairMissingCovers } = useBooks();
  const [repairing, setRepairing] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirmed = window.confirm(
      "Import Library Backup?\n\nThis will replace the current local library and settings on this device with the contents of the selected backup file.\n\nPress OK to Import and Replace, or Cancel to abort."
    );

    if (!confirmed) {
      e.target.value = null; // reset input
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      await importLibrary(text);
      alert("Library successfully imported! The application will now reload.");
      window.location.reload();
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      setImporting(false);
      if (e.target) e.target.value = null; // reset input
    }
  };

  return (
    <div className="settings-page">
      <header className="page-header">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {t('settings.title')}
        </motion.h1>
      </header>

      <div className="settings-content">
        <section className="settings-section glass-panel">
          <h2>Appearance</h2>
          
          <div className="setting-group">
            <label>Theme (Glass Tint)</label>
            <div className="button-group">
              <button 
                className={`glass-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
              <button 
                className={`glass-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
              <button 
                className={`glass-btn ${theme === 'blue' ? 'active' : ''}`}
                onClick={() => setTheme('blue')}
              >
                Blue
              </button>
              <button 
                className={`glass-btn ${theme === 'purple' ? 'active' : ''}`}
                onClick={() => setTheme('purple')}
              >
                Purple
              </button>
              <button 
                className={`glass-btn ${theme === 'orange' ? 'active' : ''}`}
                onClick={() => setTheme('orange')}
              >
                Orange
              </button>
              <button 
                className={`glass-btn ${theme === 'cyan' ? 'active' : ''}`}
                onClick={() => setTheme('cyan')}
              >
                Cyan
              </button>
            </div>
          </div>

          <div className="setting-group">
            <label>Atmospheric Background</label>
            <p className="setting-hint">Choose a scene to set the mood for your reading room.</p>
            <div className="background-gallery">
              {BACKGROUNDS.map(bg => (
                <div 
                  key={bg.id} 
                  className={`bg-preview-card ${background === bg.id ? 'active' : ''}`}
                  onClick={() => setBackground(bg.id)}
                >
                  <img src={bg.url} alt={bg.name} />
                  <div className="bg-name">{bg.name}</div>
                  <AnimatePresence>
                    {background === bg.id && (
                      <motion.div 
                        className="bg-check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                      >
                        <Check size={16} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>


        <section className="settings-section glass-panel">
          <h2>Language</h2>
          <div className="setting-group">
            <div className="button-group vertical">
              <button 
                className={`glass-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('en')}
              >
                English
              </button>
              <button 
                className={`glass-btn ${language === 'ja' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('ja')}
              >
                日本語 (Japanese)
              </button>
              <button 
                className={`glass-btn ${language === 'fr' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('fr')}
              >
                Français (French)
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section glass-panel">
          <h2>Notes</h2>
          <div className="setting-group">
            <label>Note Theme</label>
            <p className="setting-hint">Choose the visual style of your note editing environment.</p>
            <div className="button-group vertical" style={{ gap: '12px', marginTop: '12px' }}>
              <button 
                className={`glass-btn ${noteTheme === 'default' ? 'active' : ''}`}
                onClick={() => setNoteTheme('default')}
                style={{ textAlign: 'left', padding: '16px' }}
              >
                <strong>Default</strong><br/>
                <small>Clean white, minimalistic, excellent typography.</small>
              </button>
              <button 
                className={`glass-btn ${noteTheme === 'paper' ? 'active' : ''}`}
                onClick={() => setNoteTheme('paper')}
                style={{ textAlign: 'left', padding: '16px' }}
              >
                <strong>Paper</strong><br/>
                <small>Warm off-white textured paper with horizontal ruled lines.</small>
              </button>
              <button 
                className={`glass-btn ${noteTheme === 'neumorphic' ? 'active' : ''}`}
                onClick={() => setNoteTheme('neumorphic')}
                style={{ textAlign: 'left', padding: '16px' }}
              >
                <strong>Neumorphic</strong><br/>
                <small>Modern, soft extruded panels and inset shadows.</small>
              </button>
              <button 
                className={`glass-btn ${noteTheme === 'pen' ? 'active' : ''}`}
                onClick={() => setNoteTheme('pen')}
                style={{ textAlign: 'left', padding: '16px' }}
              >
                <strong>Writing with a Pen</strong><br/>
                <small>Warm paper texture, handwritten typography, and ink colors.</small>
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section glass-panel">
          <h2>Data Management</h2>
          <div className="setting-group">
            <label>Export & Import</label>
            <p className="setting-hint">Back up your entire library, notes, and settings to a JSON file, or restore them from a previous backup.</p>
            <div className="button-group" style={{ marginTop: '12px', gap: '12px' }}>
              <button 
                className="glass-btn primary" 
                onClick={() => exportLibrary()}
              >
                Export Library
              </button>
              
              <label className={`glass-btn ${importing ? 'disabled' : ''}`} style={{ cursor: 'pointer', textAlign: 'center', margin: 0 }}>
                {importing ? 'Importing...' : 'Import Library'}
                <input 
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }} 
                  onChange={handleImportFile}
                  disabled={importing}
                />
              </label>
            </div>
            
            <div style={{ marginTop: '16px' }}>
              <button 
                className="glass-btn" 
                onClick={async () => {
                  const localforage = (await import('localforage')).default;
                  const metadataStore = localforage.createInstance({ name: 'ReadingKnowledgeApp', storeName: 'sync_metadata' });
                  const outboxStore = localforage.createInstance({ name: 'ReadingKnowledgeApp', storeName: 'sync_outbox' });
                  
                  // Reset migration status to force a full re-upload of local data if the cloud is empty
                  await metadataStore.setItem('migration_status', 'in_progress');
                  await metadataStore.setItem('last_sync_down', '2000-01-01T00:00:00.000Z');
                  await outboxStore.setItem('queue', []);
                  
                  const { syncEngine } = await import('../lib/syncEngine');
                  
                  // Restart the sync engine to trigger full migration or reconciliation
                  syncEngine.isInitializing = false; 
                  await syncEngine.initialize();
                  
                  alert('Force sync complete! UI will refresh.');
                }}
              >
                Force Cloud Sync (Recovery)
              </button>
              <p className="setting-hint" style={{ marginTop: '8px' }}>Use this if some cloud data is missing due to a network interruption.</p>
            </div>
          </div>
          
          <div className="setting-group" style={{ marginTop: '24px' }}>
            <label>Account</label>
            <p className="setting-hint">Sign out to stop synchronizing data on this device.</p>
            <button 
              className="glass-btn" 
              style={{ marginTop: '12px', color: '#ff3b30' }}
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
            >
              Sign Out
            </button>
          </div>
        </section>

        <section className="settings-section glass-panel">
          <h2>Library Tools</h2>
          <div className="setting-group">
            <label>Cover Resolution Engine</label>
            <p className="setting-hint">Automatically scan your library and attempt to find high-quality covers for books that are currently using placeholders.</p>
            <button 
              className="glass-btn primary" 
              onClick={async () => {
                setRepairing(true);
                await repairMissingCovers();
                setTimeout(() => setRepairing(false), 1500);
              }}
              disabled={repairing}
              style={{ marginTop: 12, minWidth: 200 }}
            >
              {repairing ? 'Repairing Covers...' : 'Repair Missing Covers'}
            </button>
          </div>
        </section>
      </div>

      <div style={{ marginTop: '32px', paddingBottom: '32px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
        <p>Build: markdown-fix-2026-08-17</p>
      </div>

    </div>
  );
}
