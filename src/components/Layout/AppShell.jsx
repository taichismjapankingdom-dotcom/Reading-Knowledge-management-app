import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, Settings, Book } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { migrateAllNotes } from '../../hooks/useNotes';
import './AppShell.css';

export default function AppShell() {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    migrateAllNotes();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const NAV_ITEMS = [
    { path: '/', icon: BookOpen, label: t('nav.bookshelf') },
    { path: '/settings', icon: Settings, label: t('nav.settings') }
  ];

  return (
    <div className="app-container">
      {/* Background layer for theming is handled in App.jsx or body */}

      {!isMobile && (
        <aside className="sidebar glass-panel" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none', display: 'flex', flexDirection: 'column' }}>
          <div className="sidebar-header">
            <h2>ReadMind</h2>
          </div>
          <nav className="sidebar-nav" style={{ flexGrow: 1 }}>
            {NAV_ITEMS.map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={20} className="nav-icon" />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div 
                        className="active-indicator-desktop"
                        layoutId="active-nav-desktop"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>
      )}

      <main className="main-content">
        <Outlet />
      </main>

      {isMobile && (
        <nav className="glass-bottom-nav bottom-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path}
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={24} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div 
                      className="active-indicator-mobile"
                      layoutId="active-nav-mobile"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
