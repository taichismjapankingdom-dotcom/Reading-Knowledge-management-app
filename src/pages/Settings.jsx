import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/useSettingsStore';
import { useBooks } from '../hooks/useBooks';
import { Check } from 'lucide-react';
import { exportLibrary, importLibrary } from '../utils/dataTransfer';
import { supabase } from '../lib/supabase';

import bgGothicLibrary from '../assets/dark-academia/gothic_library.jpg';
import bgCathedralStudy from '../assets/dark-academia/cathedral_study.jpg';
import bgOldCorridor from '../assets/dark-academia/old_corridor.jpg';
import bgCandlelitRoom from '../assets/dark-academia/candlelit_room.jpg';
import bgRainyNight from '../assets/dark-academia/rainy_night.jpg';

const DARK_ACADEMIA_BACKGROUNDS = {
  gothic_library: bgGothicLibrary,
  cathedral_study: bgCathedralStudy,
  old_corridor: bgOldCorridor,
  candlelit_room: bgCandlelitRoom,
  rainy_night: bgRainyNight
};

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
  const { 
    language, theme, background, noteTheme, 
    noteGradientPreset, woodType, globalGradientPreset, darkAcademiaPreset,
    setLanguage, setTheme, setBackground, setNoteTheme,
    setNoteGradientPreset, setWoodType, setGlobalGradientPreset, setDarkAcademiaPreset 
  } = useSettingsStore();
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
      t('settings.import_confirm')
    );

    if (!confirmed) {
      e.target.value = null; // reset input
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      await importLibrary(text);
      alert(t('settings.import_success'));
      window.location.reload();
    } catch (err) {
      alert(t('settings.import_failed') + err.message);
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
          <h2>{t('settings.appearance')}</h2>
          
          <div className="setting-group">
            <label>{t('settings.theme_glass_tint')}</label>
            <div className="button-group">
              <button 
                className={`glass-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                {t('settings.theme_light')}
              </button>
              <button 
                className={`glass-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                {t('settings.theme_dark')}
              </button>
              <button 
                className={`glass-btn ${theme === 'blue' ? 'active' : ''}`}
                onClick={() => setTheme('blue')}
              >
                {t('settings.theme_blue')}
              </button>
              <button 
                className={`glass-btn ${theme === 'purple' ? 'active' : ''}`}
                onClick={() => setTheme('purple')}
              >
                {t('settings.theme_purple')}
              </button>
              <button 
                className={`glass-btn ${theme === 'orange' ? 'active' : ''}`}
                onClick={() => setTheme('orange')}
              >
                {t('settings.theme_orange')}
              </button>
              <button 
                className={`glass-btn ${theme === 'cyan' ? 'active' : ''}`}
                onClick={() => setTheme('cyan')}
              >
                {t('settings.theme_cyan')}
              </button>
            </div>
          </div>

          <div className="setting-group">
            <label>{t('settings.atmospheric_background')}</label>
            <p className="setting-hint">{t('settings.bg_hint')}</p>
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
              <div 
                className={`bg-preview-card ${background === 'gradient' ? 'active' : ''}`}
                onClick={() => setBackground('gradient')}
              >
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' }} />
                <div className="bg-name">{t('settings.bg_gradient') || 'Gradient'}</div>
                <AnimatePresence>
                  {background === 'gradient' && (
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
              <div 
                className={`bg-preview-card ${background === 'dark_academia' ? 'active' : ''}`}
                onClick={() => setBackground('dark_academia')}
              >
                <img src={DARK_ACADEMIA_BACKGROUNDS[darkAcademiaPreset || 'gothic_library']} alt="Dark Academia" />
                <div className="bg-name">{t('settings.bg_dark_academia') || 'Dark Academia'}</div>
                <AnimatePresence>
                  {background === 'dark_academia' && (
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
            </div>

            <AnimatePresence>
              {background === 'gradient' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden', marginTop: '16px' }}
                >
                  <label>{t('settings.bg_gradient_preset') || 'Gradient Preset'}</label>
                  <div className="button-group" style={{ marginTop: '8px' }}>
                    {[
                      { id: 'midnight', label: 'Midnight', bg: 'linear-gradient(135deg, #0d0a21 0%, #201335 100%)' },
                      { id: 'ocean', label: 'Ocean', bg: 'linear-gradient(135deg, #09203f 0%, #537895 100%)' },
                      { id: 'sunset', label: 'Sunset', bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
                      { id: 'purpleblue', label: 'Purple Blue', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
                      { id: 'forest', label: 'Forest', bg: 'linear-gradient(135deg, #114357 0%, #f29492 100%)' },
                      { id: 'pastel', label: 'Soft Pastel', bg: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
                    ].map(preset => (
                      <button
                        key={preset.id}
                        className={`glass-btn ${globalGradientPreset === preset.id ? 'active' : ''}`}
                        onClick={() => setGlobalGradientPreset(preset.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', background: preset.bg, border: '1px solid rgba(255,255,255,0.2)' }} />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {background === 'dark_academia' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden', marginTop: '16px' }}
                >
                  <label>{t('settings.bg_dark_academia_preset') || 'Architecture Variant'}</label>
                  <div className="button-group vertical" style={{ marginTop: '8px' }}>
                    {[
                      { id: 'gothic_library', label: t('settings.da_gothic_library') || 'Gothic Library' },
                      { id: 'cathedral_study', label: t('settings.da_cathedral_study') || 'Cathedral Study Hall' },
                      { id: 'old_corridor', label: t('settings.da_old_corridor') || 'Old University Corridor' },
                      { id: 'candlelit_room', label: t('settings.da_candlelit_room') || 'Candlelit Reading Room' },
                      { id: 'rainy_night', label: t('settings.da_rainy_night') || 'Rainy Academic Night' },
                    ].map(preset => (
                      <button
                        key={preset.id}
                        className={`glass-btn ${darkAcademiaPreset === preset.id ? 'active' : ''}`}
                        onClick={() => setDarkAcademiaPreset(preset.id)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '12px 16px', gap: '10px' }}
                      >
                        <img 
                          src={DARK_ACADEMIA_BACKGROUNDS[preset.id]} 
                          style={{ minWidth: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.3)' }} 
                          alt="" 
                        />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className="settings-section glass-panel">
          <h2>{t('settings.language')}</h2>
          <div className="setting-group">
            <div className="button-group vertical">
              <button 
                className={`glass-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('en')}
              >
                {t('settings.language_en')}
              </button>
              <button 
                className={`glass-btn ${language === 'ja' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('ja')}
              >
                {t('settings.language_ja')}
              </button>
              <button 
                className={`glass-btn ${language === 'fr' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('fr')}
              >
                {t('settings.language_fr')}
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section glass-panel">
          <h2>{t('settings.notes')}</h2>
          <div className="setting-group">
            <label>{t('settings.note_theme')}</label>
            <p className="setting-hint">{t('settings.note_theme_hint')}</p>
            <div className="button-group vertical" style={{ gap: '12px', marginTop: '12px' }}>
              <button 
                className={`glass-btn ${noteTheme === 'default' ? 'active' : ''}`}
                onClick={() => setNoteTheme('default')}
                style={{ textAlign: 'left', padding: '16px' }}
              >
                <strong>{t('settings.note_theme_default')}</strong><br/>
                <small>{t('settings.note_theme_default_desc')}</small>
              </button>
              <button 
                className={`glass-btn ${noteTheme === 'paper' ? 'active' : ''}`}
                onClick={() => setNoteTheme('paper')}
                style={{ textAlign: 'left', padding: '16px' }}
              >
                <strong>{t('settings.note_theme_paper')}</strong><br/>
                <small>{t('settings.note_theme_paper_desc')}</small>
              </button>
              <button 
                className={`glass-btn ${noteTheme === 'neumorphic' ? 'active' : ''}`}
                onClick={() => setNoteTheme('neumorphic')}
                style={{ textAlign: 'left', padding: '16px' }}
              >
                <strong>{t('settings.note_theme_neumorphic')}</strong><br/>
                <small>{t('settings.note_theme_neumorphic_desc')}</small>
              </button>
              <button 
                className={`glass-btn ${noteTheme === 'pen' ? 'active' : ''}`}
                onClick={() => setNoteTheme('pen')}
                style={{ textAlign: 'left', padding: '16px' }}
              >
                <strong>{t('settings.note_theme_pen')}</strong><br/>
                <small>{t('settings.note_theme_pen_desc')}</small>
              </button>
              <button 
                className={`glass-btn ${noteTheme === 'gradient' ? 'active' : ''}`}
                onClick={() => setNoteTheme('gradient')}
                style={{ textAlign: 'left', padding: '16px' }}
              >
                <strong>{t('settings.note_theme_gradient') || 'Gradient'}</strong><br/>
                <small>{t('settings.note_theme_gradient_desc') || 'Modern soft blended colors.'}</small>
              </button>
              <button 
                className={`glass-btn ${noteTheme === 'wood' ? 'active' : ''}`}
                onClick={() => setNoteTheme('wood')}
                style={{ textAlign: 'left', padding: '16px' }}
              >
                <strong>{t('settings.note_theme_wood') || 'Wooden Notes'}</strong><br/>
                <small>{t('settings.note_theme_wood_desc') || 'Highly realistic tactile wood materials.'}</small>
              </button>
            </div>

            <AnimatePresence>
              {noteTheme === 'gradient' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden', marginTop: '16px' }}
                >
                  <label>{t('settings.note_gradient_preset') || 'Gradient Preset'}</label>
                  <div className="button-group" style={{ marginTop: '8px' }}>
                    {[
                      { id: 'midnight', label: 'Midnight', bg: 'linear-gradient(135deg, #0d0a21 0%, #201335 100%)' },
                      { id: 'ocean', label: 'Ocean', bg: 'linear-gradient(135deg, #09203f 0%, #537895 100%)' },
                      { id: 'sunset', label: 'Sunset', bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
                      { id: 'purpleblue', label: 'Purple Blue', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
                      { id: 'forest', label: 'Forest', bg: 'linear-gradient(135deg, #114357 0%, #f29492 100%)' },
                      { id: 'pastel', label: 'Soft Pastel', bg: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
                    ].map(preset => (
                      <button
                        key={preset.id}
                        className={`glass-btn ${noteGradientPreset === preset.id ? 'active' : ''}`}
                        onClick={() => setNoteGradientPreset(preset.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', background: preset.bg, border: '1px solid rgba(255,255,255,0.2)' }} />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {noteTheme === 'wood' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden', marginTop: '16px' }}
                >
                  <label>{t('settings.wood_type') || 'Wood Type'}</label>
                  <div className="button-group" style={{ marginTop: '8px' }}>
                    <button
                      className={`glass-btn ${woodType === 'natural' ? 'active' : ''}`}
                      onClick={() => setWoodType('natural')}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '4px', background: '#d9af85', border: '1px solid rgba(0,0,0,0.2)' }} />
                      {t('settings.wood_natural') || 'Natural Wood'}
                    </button>
                    <button
                      className={`glass-btn ${woodType === 'birch' ? 'active' : ''}`}
                      onClick={() => setWoodType('birch')}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '4px', background: '#f5f1ec', border: '1px solid rgba(0,0,0,0.2)' }} />
                      {t('settings.wood_birch') || 'White Birch'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className="settings-section glass-panel">
          <h2>{t('settings.data_management')}</h2>
          <div className="setting-group">
            <label>{t('settings.export_import')}</label>
            <p className="setting-hint">{t('settings.export_import_hint')}</p>
            <div className="button-group" style={{ marginTop: '12px', gap: '12px' }}>
              <button 
                className="glass-btn primary" 
                onClick={() => exportLibrary()}
              >
                {t('settings.export_library')}
              </button>
              
              <label className={`glass-btn ${importing ? 'disabled' : ''}`} style={{ cursor: 'pointer', textAlign: 'center', margin: 0 }}>
                {importing ? t('settings.importing') : t('settings.import_library')}
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
                  
                  alert(t('settings.force_sync_complete'));
                }}
              >
                {t('settings.force_sync')}
              </button>
              <p className="setting-hint" style={{ marginTop: '8px' }}>{t('settings.force_sync_hint')}</p>
            </div>
          </div>
          
          <div className="setting-group" style={{ marginTop: '24px' }}>
            <label>{t('settings.account')}</label>
            <p className="setting-hint">{t('settings.account_hint')}</p>
            <button 
              className="glass-btn" 
              style={{ marginTop: '12px', color: '#ff3b30' }}
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
            >
              {t('settings.sign_out')}
            </button>
          </div>
        </section>

        <section className="settings-section glass-panel">
          <h2>{t('settings.library_tools')}</h2>
          <div className="setting-group">
            <label>{t('settings.cover_resolution')}</label>
            <p className="setting-hint">{t('settings.cover_resolution_hint')}</p>
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
              {repairing ? t('settings.repairing_covers') : t('settings.repair_covers')}
            </button>
          </div>
        </section>
      </div>

      <div style={{ marginTop: '32px', paddingBottom: '32px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
        <p>{t('settings.build_info')}</p>
      </div>

    </div>
  );
}
