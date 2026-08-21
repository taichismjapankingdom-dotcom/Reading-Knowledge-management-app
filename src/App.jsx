import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShell from './components/Layout/AppShell';
import { AuthProvider, useAuth } from './components/Auth/AuthProvider';
import Auth from './components/Auth/Auth';

import Bookshelf from './pages/Bookshelf';
import Settings from './pages/Settings';
import DiagnosticMarkdown from './pages/DiagnosticMarkdown';
import './App.css';

import { useSettingsStore } from './store/useSettingsStore';

const BACKGROUNDS = {
  cozy: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2069&auto=format&fit=crop',
  modern: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop',
  library: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2190&auto=format&fit=crop',
  nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071&auto=format&fit=crop',
  abstract: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop'
};

function AuthWrapper({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading library...</div>;
  }
  
  if (!user) {
    return <Auth />;
  }
  
  return children;
}

function App() {
  const theme = useSettingsStore((state) => state.theme);
  const language = useSettingsStore((state) => state.language);
  const background = useSettingsStore((state) => state.background);
  const globalGradientPreset = useSettingsStore((state) => state.globalGradientPreset);
  const { i18n } = useTranslation();

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync language
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  const isGradient = background === 'gradient';

  return (
    <AuthProvider>
      <HashRouter>
        <div 
          className={`app-background-layer ${isGradient ? 'is-gradient gradient-' + globalGradientPreset : ''}`}
          style={!isGradient ? { backgroundImage: `url(${BACKGROUNDS[background || 'nature']})` } : {}}
        >
          {!isGradient && <div className="app-background-overlay"></div>}
        </div>
        <AuthWrapper>
          <Routes>
            <Route path="/" element={<AppShell />}>
              <Route index element={<Bookshelf />} />
              <Route path="settings" element={<Settings />} />
              <Route path="markdown-test" element={<DiagnosticMarkdown />} />
            </Route>
          </Routes>
        </AuthWrapper>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
