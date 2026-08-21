import { useState, useEffect, useCallback } from 'react';
import localforage from 'localforage';
import { syncEngine } from '../lib/syncEngine';

const notesStore = localforage.createInstance({
  name: 'ReadingKnowledgeApp',
  storeName: 'notes'
});

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export async function migrateAllNotes() {
  const migratedV2 = await localforage.getItem('notes_migrated_v2');
  const migratedV3 = await localforage.getItem('notes_migrated_v3');
  
  if (migratedV2 && migratedV3) return;

  try {
    console.log("Starting notes migration...");
    await notesStore.iterate(async (content, key) => {
      if (typeof content === 'string') {
        let newContent = content;
        
        // V2 Migration: Remove empty Questions and How I Can Apply This
        newContent = newContent.replace(/## Questions\s*$/m, '').trim();
        newContent = newContent.replace(/## Questions\s+##/m, '##');
        newContent = newContent.replace(/## How I Can Apply This\s*$/m, '').trim();
        newContent = newContent.replace(/## How I Can Apply This\s+##/m, '##');
        
        // V3 Migration: Normalize WYSIWYG escapes and zero-width spaces
        newContent = newContent.replace(/\\\*\\\*/g, '**');
        newContent = newContent.replace(/\\_/g, '_');
        newContent = newContent.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        const jsonFormat = {
          markdown: newContent,
          favoriteQuotes: [],
          newWords: []
        };
        
        await notesStore.setItem(key, jsonFormat);
      } else if (content && typeof content === 'object') {
        // V3 Migration for already structured notes
        if (content.markdown) {
          let newContent = content.markdown;
          newContent = newContent.replace(/\\\*\\\*/g, '**');
          newContent = newContent.replace(/\\_/g, '_');
          newContent = newContent.replace(/[\u200B-\u200D\uFEFF]/g, '');
          
          if (newContent !== content.markdown) {
            await notesStore.setItem(key, { ...content, markdown: newContent });
          }
        }
      }
    });
    if (!migratedV2) await localforage.setItem('notes_migrated_v2', true);
    if (!migratedV3) await localforage.setItem('notes_migrated_v3', true);
    console.log("Notes migration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

export function useNotes(bookId) {
  const [note, setNote] = useState({ markdown: '', favoriteQuotes: [], newWords: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNote() {
      if (!bookId) return;
      try {
        setLoading(true);
        const localNote = await notesStore.getItem(`note_${bookId}`);
        if (localNote) {
           if (typeof localNote === 'string') {
             // Fallback runtime migration if somehow missed
             setNote({ markdown: localNote, favoriteQuotes: [], newWords: [] });
           } else {
             setNote(localNote);
           }
        } else {
           setNote({ markdown: '', favoriteQuotes: [], newWords: [] });
        }
      } catch (err) {
        console.warn("Note fetch failed.", err);
        setNote({ markdown: '', favoriteQuotes: [], newWords: [] });
      } finally {
        setLoading(false);
      }
    }
    
    fetchNote();

    const handleSync = () => fetchNote();
    window.addEventListener('sync_notes_updated', handleSync);
    return () => window.removeEventListener('sync_notes_updated', handleSync);
  }, [bookId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveNoteToDB = useCallback(
    debounce(async (content) => {
      if (!bookId) return;
      
      const now = new Date().toISOString();
      const payload = { ...content, updated_at: now };

      // Save locally instantly
      await notesStore.setItem(`note_${bookId}`, payload);

      // Queue for sync
      await syncEngine.queueMutation('notes', 'UPSERT', {
        book_id: bookId,
        content: payload,
        updated_at: now
      }, bookId);
    }, 1000),
    [bookId]
  );

  const saveNote = (content) => {
    setNote(content);
    saveNoteToDB(content);
  };

  return { note, loading, saveNote };
}
