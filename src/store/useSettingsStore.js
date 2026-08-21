import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncEngine } from '../lib/syncEngine';

export const useSettingsStore = create(
  persist(
    (set) => ({
      language: 'en',
      theme: 'light',
      background: 'nature', // default background
      noteTheme: 'default', // default note theme
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme }),
      setBackground: (bg) => set({ background: bg }),
      setNoteTheme: (noteTheme) => set({ noteTheme }),
    }),
    {
      name: 'readmind-settings',
    }
  )
);

let isRemoteUpdateActive = false;

// Subscribe to push mutations
useSettingsStore.subscribe((state, prevState) => {
  if (isRemoteUpdateActive) {
    return; // Suppress outbound sync for remote payloads!
  }

  // Only push if actual values changed, to avoid loops
  if (
    state.language !== prevState.language || 
    state.theme !== prevState.theme || 
    state.background !== prevState.background || 
    state.noteTheme !== prevState.noteTheme
  ) {
    console.log(`[Preferences] Local preferences changed (e.g. theme: ${state.theme}).`);
    const preferences = {
      language: state.language,
      theme: state.theme,
      background: state.background,
      noteTheme: state.noteTheme
    };
    syncEngine.queueMutation('user_preferences', 'UPSERT', { preferences }, 'settings');
  }
});

// Listen to pulls from syncEngine
window.addEventListener('sync_settings_updated', (e) => {
  if (e.detail && e.detail.preferences) {
    console.log(`[Realtime] Preference UPDATE received`);
    console.log(`[Preferences] Applying remote preferences:`, e.detail.preferences);
    
    isRemoteUpdateActive = true;
    useSettingsStore.setState(e.detail.preferences);
    
    // Clear flag after React/Zustand processes the state change
    setTimeout(() => { 
      isRemoteUpdateActive = false; 
      console.log(`[Preferences] Remote update applied without outbound re-sync`);
    }, 50);
  }
});
