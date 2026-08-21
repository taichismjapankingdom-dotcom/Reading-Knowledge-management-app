import localforage from 'localforage';
import { supabase } from './supabase';

const outboxStore = localforage.createInstance({ name: 'ReadingKnowledgeApp', storeName: 'sync_outbox' });
const metadataStore = localforage.createInstance({ name: 'ReadingKnowledgeApp', storeName: 'sync_metadata' });
const notesStore = localforage.createInstance({ name: 'ReadingKnowledgeApp', storeName: 'notes' });
const conflictsStore = localforage.createInstance({ name: 'ReadingKnowledgeApp', storeName: 'notes_conflicts' });

// ISBN-10 to 13 converter
function normalizeISBN(isbn) {
  if (!isbn) return null;
  let clean = isbn.replace(/[-\s]/g, '').toUpperCase();
  if (clean.length === 10) {
    let sum = 0;
    const prefix = '978' + clean.substring(0, 9);
    for (let i = 0; i < 12; i++) {
      sum += parseInt(prefix[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    clean = prefix + checkDigit;
  }
  return clean.length === 13 ? clean : null;
}

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export const syncEngine = {
  isSyncing: false,
  isInitializing: false,
  realtimeChannel: null,

  async initialize() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      console.log(`[SyncEngine] initialize() called`);
      console.log(`[SyncEngine] Authenticated user: ${session.user.id}`);

      const localBooks = (await localforage.getItem('all_books')) || [];
      console.log(`[SyncEngine] Local books detected: ${localBooks.length}`);

      const { count: cloudBooksCount, error: countError } = await supabase
        .from('books')
        .select('id', { count: 'exact', head: true });

      if (countError) {
        console.error("[SyncEngine] Failed to check remote status. Aborting initialization.", countError);
        return;
      }
      
      console.log(`[SyncEngine] Cloud books detected: ${cloudBooksCount}`);

      const status = await metadataStore.getItem('migration_status');
      
      // Safety net: if marked complete but cloud is entirely empty and local has books,
      // it means a previous buggy run set it to complete without actually uploading.
      if (status === 'completed' && cloudBooksCount === 0 && localBooks.length > 0) {
        console.warn(`[SyncEngine] Repairing state: marked completed but cloud is empty. Forcing migration.`);
        await metadataStore.setItem('migration_status', 'in_progress');
      } else if (status === 'completed') {
        this.syncDown();
        this.syncUp();
        this.startRealtime();
        return;
      }

    if (localBooks.length > 0 && cloudBooksCount === 0) {
      console.log("[SyncEngine] Scenario A: Initial migration required. Pushing local library to cloud...");
      
      // Clear outbox first to wipe out any failed legacy ID attempts
      await outboxStore.setItem('queue', []);

      // Queue all books
      for (let i = 0; i < localBooks.length; i++) {
        let book = localBooks[i];
        
        // Upgrade legacy IDs to valid UUIDs before inserting into Supabase
        if (!isUUID(book.id)) {
          const oldId = book.id;
          const newId = crypto.randomUUID();
          console.log(`[SyncEngine] Upgrading legacy ID ${oldId} -> UUID ${newId}`);
          book.legacy_id = oldId;
          book.id = newId;
          
          // Rewrite associated note safely
          const note = await notesStore.getItem(`note_${oldId}`);
          if (note) {
            await notesStore.setItem(`note_${newId}`, note);
            await notesStore.removeItem(`note_${oldId}`);
          }
        }
        
        console.log(`[SyncEngine] Queueing book ${i + 1}/${localBooks.length}: ${book.title}`);
        await this.queueMutation('books', 'UPSERT', book, book.id);
      }
      await localforage.setItem('all_books', localBooks);
      
      // Queue all notes
      const noteKeys = await notesStore.keys();
      for (const key of noteKeys) {
        if (!key.startsWith('note_')) continue;
        const content = await notesStore.getItem(key);
        const bookId = key.replace('note_', '');
        await this.queueMutation('notes', 'UPSERT', { book_id: bookId, content, updated_at: content.updated_at || new Date().toISOString() }, bookId);
      }
      
      // Queue preferences
      const prefsStr = localStorage.getItem('readmind-settings');
      if (prefsStr) {
        try {
          const state = JSON.parse(prefsStr).state;
          const prefsToSync = {
            language: state.language,
            theme: state.theme,
            background: state.background,
            noteTheme: state.noteTheme
          };
          await this.queueMutation('user_preferences', 'UPSERT', { preferences: prefsToSync }, 'settings');
        } catch(e) {}
      }

      await this.syncUp();

      // VERIFICATION
      const { count: verifyBooksCount } = await supabase.from('books').select('id', { count: 'exact', head: true });
      const { count: verifyNotesCount } = await supabase.from('notes').select('id', { count: 'exact', head: true });
      
      if (verifyBooksCount === localBooks.length && verifyNotesCount === noteKeys.length) {
        console.log("[SyncEngine] Migration completed and verified.");
        await metadataStore.setItem('migration_status', 'completed');
        this.startRealtime();
      } else {
        console.error(`[SyncEngine] Migration verification failed! Books: ${verifyBooksCount}/${localBooks.length}, Notes: ${verifyNotesCount}/${noteKeys.length}`);
        await metadataStore.setItem('migration_status', 'failed');
      }

    } else if (localBooks.length === 0 && cloudBooksCount > 0) {
      console.log("[SyncEngine] Scenario B: Initial hydration");
      await this.syncDown();
      console.log("[SyncEngine] Phone hydration complete. UI state refreshed.");
      await metadataStore.setItem('migration_status', 'completed');
      this.startRealtime();
    } else if (localBooks.length === 0 && cloudBooksCount === 0) {
      console.log("[SyncEngine] Scenario C: Fresh account.");
      await metadataStore.setItem('migration_status', 'completed');
      this.startRealtime();
    } else {
      console.log("[SyncEngine] Scenario D: Reconciliation required. Merging local and cloud...");
      await this.reconcileLocalAndCloud();
      await metadataStore.setItem('migration_status', 'completed');
      this.startRealtime();
    }
    } finally {
      this.isInitializing = false;
    }
  },

  async reconcileLocalAndCloud() {
    const { data: cloudBooks } = await supabase.from('books').select('*');
    if (!cloudBooks) return;

    let localBooks = (await localforage.getItem('all_books')) || [];
    let updatedLocalBooks = [...localBooks];
    let hasChanges = false;

    const cloudById = new Map();
    const cloudByIsbn = new Map();
    for (const cb of cloudBooks) {
      cloudById.set(cb.id, cb);
      const normIsbn = normalizeISBN(cb.isbn);
      if (normIsbn) cloudByIsbn.set(normIsbn, cb);
    }

    for (let i = 0; i < updatedLocalBooks.length; i++) {
      const lb = updatedLocalBooks[i];
      const normLocalIsbn = normalizeISBN(lb.isbn);

      if (cloudById.has(lb.id)) {
        // A. Same canonical UUID
        const cb = cloudById.get(lb.id);
        if (new Date(cb.updated_at) > new Date(lb.updated_at || '2000-01-01')) {
          updatedLocalBooks[i] = cb;
          hasChanges = true;
        } else if (new Date(lb.updated_at || '2000-01-01') > new Date(cb.updated_at)) {
          await this.queueMutation('books', 'UPSERT', lb, lb.id);
        }
      } else if (normLocalIsbn && cloudByIsbn.has(normLocalIsbn)) {
        // B. Different IDs but same normalized ISBN
        const cb = cloudByIsbn.get(normLocalIsbn);
        console.log(`[SyncEngine] Deduplicating edition: matching local ${lb.id} to cloud ${cb.id} via ISBN ${normLocalIsbn}`);
        
        const oldId = lb.id;
        const newId = cb.id;
        
        // Atomically rewrite note relationship
        const note = await notesStore.getItem(`note_${oldId}`);
        if (note) {
          await notesStore.setItem(`note_${newId}`, note);
          await notesStore.removeItem(`note_${oldId}`);
          await this.queueMutation('notes', 'UPSERT', { book_id: newId, content: note, updated_at: note.updated_at || new Date().toISOString() }, newId);
        }

        lb.legacy_id = oldId;
        lb.id = newId;
        if (new Date(cb.updated_at) > new Date(lb.updated_at || '2000-01-01')) {
          updatedLocalBooks[i] = { ...cb, legacy_id: oldId }; 
        } else {
          updatedLocalBooks[i] = lb;
          await this.queueMutation('books', 'UPSERT', lb, lb.id);
        }
        hasChanges = true;

      } else {
        // C & D. Different IDs and no matching ISBN (or no ISBN)
        
        // Upgrade legacy IDs to UUIDs
        if (!isUUID(lb.id)) {
           const oldId = lb.id;
           const newId = crypto.randomUUID();
           console.log(`[SyncEngine] Upgrading unique legacy ID ${oldId} -> UUID ${newId}`);
           lb.legacy_id = oldId;
           lb.id = newId;
           
           const note = await notesStore.getItem(`note_${oldId}`);
           if (note) {
              await notesStore.setItem(`note_${newId}`, note);
              await notesStore.removeItem(`note_${oldId}`);
           }
        }

        console.log(`[SyncEngine] Pushing unique local record to cloud: ${lb.title}`);
        await this.queueMutation('books', 'UPSERT', lb, lb.id);
        const note = await notesStore.getItem(`note_${lb.id}`);
        if (note) {
          await this.queueMutation('notes', 'UPSERT', { book_id: lb.id, content: note, updated_at: note.updated_at || new Date().toISOString() }, lb.id);
        }
      }
    }

    if (hasChanges) {
      await localforage.setItem('all_books', updatedLocalBooks);
      window.dispatchEvent(new Event('sync_books_updated'));
    }
  },

  async queueMutation(table, action, payload, id) {
    const timestamp = new Date().toISOString();
    const mutation = { table, action, payload, id, timestamp };
    
    console.log(`[SyncUp] Added local ${table} mutation for: ${id || 'settings'}`);

    const outbox = (await outboxStore.getItem('queue')) || [];
    outbox.push(mutation);
    await outboxStore.setItem('queue', outbox);

    if (navigator.onLine && await metadataStore.getItem('migration_status') === 'completed') {
      this.syncUp();
    }
  },

  async syncUp() {
    if (this.isSyncing || !navigator.onLine) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    this.isSyncing = true;
    try {
      const outbox = (await outboxStore.getItem('queue')) || [];
      if (outbox.length === 0) return;

      const successfulIds = new Set();

      for (const mutation of outbox) {
        try {
          console.log(`[SyncUp] Uploading to Supabase: ${mutation.table} (${mutation.id || 'settings'})`);
          if (mutation.table === 'books') {
            const { error } = await supabase.from('books').upsert({
              id: mutation.payload.id,
              user_id: session.user.id,
              status: mutation.payload.status,
              isbn: mutation.payload.isbn,
              title: mutation.payload.title,
              author: mutation.payload.author,
              publisher: mutation.payload.publisher,
              publishedDate: mutation.payload.publishedDate,
              description: mutation.payload.description,
              pageCount: mutation.payload.pageCount,
              categories: mutation.payload.categories,
              coverUrl: mutation.payload.coverUrl,
              coverSource: mutation.payload.coverSource,
              coverTimestamp: mutation.payload.coverTimestamp,
              updated_at: mutation.payload.updated_at || mutation.timestamp,
              deleted_at: mutation.payload.deleted_at || null
            });
            if (error) throw error;
          } 
          else if (mutation.table === 'notes') {
            const { error } = await supabase.from('notes').upsert({
              book_id: mutation.payload.book_id,
              user_id: session.user.id,
              content: mutation.payload.content,
              updated_at: mutation.payload.updated_at || mutation.timestamp,
              deleted_at: mutation.payload.deleted_at || null
            }, { onConflict: 'book_id,user_id' }); 
            if (error) throw error;
          }
          else if (mutation.table === 'user_preferences') {
            const { error } = await supabase.from('user_preferences').upsert({
              user_id: session.user.id,
              preferences: mutation.payload.preferences,
              updated_at: mutation.timestamp
            });
            if (error) {
              console.warn(`[SyncUp] Failed to sync preferences (missing table?):`, error);
              // Do NOT throw. We don't want a preferences schema error to block book/note sync.
            }
          }
          
          console.log(`[SyncUp] Supabase upsert successful: ${mutation.id || 'settings'}`);
          successfulIds.add(mutation.timestamp);
        } catch (err) {
          console.error(`[SyncUp] Supabase rejected insert for ${mutation.table}`, err);
          alert(`[DEBUG] Supabase rejected ${mutation.table}: ${err.message || JSON.stringify(err)}`);
          break; // Preserve order, retry later
        }
      }

      if (successfulIds.size > 0) {
        const remainingOutbox = outbox.filter(m => !successfulIds.has(m.timestamp));
        await outboxStore.setItem('queue', remainingOutbox);
      }
    } finally {
      this.isSyncing = false;
    }
  },

  async syncDown() {
    if (!navigator.onLine) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      const lastSyncStr = await metadataStore.getItem('last_sync_down') || '2000-01-01T00:00:00.000Z';
      const lastSyncTime = new Date(lastSyncStr);
      // 5-minute buffer to catch clock skew dropped records
      const bufferedSyncTime = new Date(lastSyncTime.getTime() - 5 * 60 * 1000).toISOString();
      const now = new Date().toISOString();
      let hasChanges = false;

      console.log(`[SyncDown] Pulling deltas since ${bufferedSyncTime}...`);

      // 1. Pull Books
      const { data: booksData, error: booksError } = await supabase.from('books').select('*').gt('updated_at', bufferedSyncTime);
        
      if (!booksError && booksData && booksData.length > 0) {
        let localBooks = (await localforage.getItem('all_books')) || [];
        const localBooksMap = new Map(localBooks.map(b => [b.id, b]));
        
        booksData.forEach(remoteBook => {
          if (remoteBook.deleted_at) {
            localBooksMap.delete(remoteBook.id); // Tombstone handling
          } else {
            // Reconcile timestamps if both exist locally
            const local = localBooksMap.get(remoteBook.id);
            if (!local || new Date(remoteBook.updated_at) > new Date(local.updated_at || '2000-01-01')) {
               localBooksMap.set(remoteBook.id, remoteBook);
            }
          }
        });
        
        await localforage.setItem('all_books', Array.from(localBooksMap.values()));
        hasChanges = true;
        console.log(`[SyncEngine] Downloaded ${booksData.length} books`);
        window.dispatchEvent(new Event('sync_books_updated'));
      }

      // 2. Pull Notes
      const { data: notesData, error: notesError } = await supabase.from('notes').select('*').gt('updated_at', bufferedSyncTime);

      if (!notesError && notesData && notesData.length > 0) {
        console.log(`[SyncEngine] Downloaded ${notesData.length} notes`);
        for (const remoteNote of notesData) {
          const localNoteKey = `note_${remoteNote.book_id}`;
          
          if (remoteNote.deleted_at) {
             await notesStore.removeItem(localNoteKey);
             continue;
          }
          
          const localNote = await notesStore.getItem(localNoteKey);
          
          if (localNote && localNote.updated_at && new Date(localNote.updated_at) > new Date(remoteNote.updated_at)) {
             // Conflict! Preserve remote note as conflict copy
             const conflictKey = `conflict_${remoteNote.book_id}_${remoteNote.updated_at}`;
             await conflictsStore.setItem(conflictKey, remoteNote.content);
             console.warn(`[SyncEngine] Note conflict detected. Preserved remote version in conflictsStore: ${conflictKey}`);
          } else {
             // Overwrite local with remote
             const mergedContent = { ...remoteNote.content, updated_at: remoteNote.updated_at };
             await notesStore.setItem(localNoteKey, mergedContent);
          }
        }
        hasChanges = true;
        window.dispatchEvent(new Event('sync_notes_updated'));
      }

      // 3. Pull Preferences
      const { data: prefsData, error: prefsError } = await supabase.from('user_preferences').select('*').gt('updated_at', bufferedSyncTime);
        
      if (!prefsError && prefsData && prefsData.length > 0) {
        const remotePrefs = prefsData[0].preferences;
        if (remotePrefs) {
          window.dispatchEvent(new CustomEvent('sync_settings_updated', { detail: { preferences: remotePrefs } }));
        }
      }

      await metadataStore.setItem('last_sync_down', now);
      console.log(`[SyncEngine] Local writes complete`);
      
    } catch (err) {
      console.error('[SyncEngine] Sync Down failed', err);
    }
  },

  startRealtime() {
    if (this.realtimeChannel) return;

    this.realtimeChannel = supabase.channel('sync-engine')
      .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
          const { table, eventType, new: newRecord, old: oldRecord } = payload;
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return;
          
          // Respect RLS / user boundary manually if payload leaks (Supabase Realtime handles this natively, but verify)
          if (newRecord?.user_id && newRecord.user_id !== session.user.id) return;

          console.log(`[Realtime] ${table.toUpperCase()} ${eventType} received.`);

          if (table === 'books') {
             if (eventType === 'INSERT' || eventType === 'UPDATE') {
                if (newRecord.deleted_at) {
                  console.log(`[Realtime] Book tombstone received: ${newRecord.id}`);
                } else {
                  console.log(`[Realtime] Book ${eventType} received: ${newRecord.id}`);
                }
                
                let localBooks = (await localforage.getItem('all_books')) || [];
                let updatedLocalBooks = [...localBooks];
                const existingIndex = updatedLocalBooks.findIndex(b => b.id === newRecord.id);
                
                if (newRecord.deleted_at) {
                  if (existingIndex >= 0) updatedLocalBooks.splice(existingIndex, 1);
                } else {
                  if (existingIndex >= 0) {
                    if (new Date(newRecord.updated_at) >= new Date(updatedLocalBooks[existingIndex].updated_at || '2000-01-01')) {
                      updatedLocalBooks[existingIndex] = newRecord;
                    }
                  } else {
                    updatedLocalBooks.unshift(newRecord);
                  }
                }
                await localforage.setItem('all_books', updatedLocalBooks);
                console.log(`[Realtime] Local cache updated: ${newRecord.id}`);
                window.dispatchEvent(new Event('sync_books_updated'));
             } else if (eventType === 'DELETE') {
                const deletedId = oldRecord?.id;
                if (deletedId) {
                  let localBooks = (await localforage.getItem('all_books')) || [];
                  const updatedLocalBooks = localBooks.filter(b => b.id !== deletedId);
                  await localforage.setItem('all_books', updatedLocalBooks);
                  console.log(`[Realtime] Local cache deleted: ${deletedId}`);
                  window.dispatchEvent(new Event('sync_books_updated'));
                }
             }
          } else if (table === 'notes') {
             if (eventType === 'INSERT' || eventType === 'UPDATE') {
                const localNoteKey = `note_${newRecord.book_id}`;
                if (newRecord.deleted_at) {
                   await notesStore.removeItem(localNoteKey);
                } else {
                   const localNote = await notesStore.getItem(localNoteKey);
                   if (!localNote || new Date(newRecord.updated_at) >= new Date(localNote.updated_at || '2000-01-01')) {
                      const mergedContent = { ...newRecord.content, updated_at: newRecord.updated_at };
                      await notesStore.setItem(localNoteKey, mergedContent);
                   }
                }
                window.dispatchEvent(new Event('sync_notes_updated'));
             }
          } else if (table === 'user_preferences') {
             if (eventType === 'INSERT' || eventType === 'UPDATE') {
                const remotePrefs = newRecord.preferences;
                if (remotePrefs) {
                  window.dispatchEvent(new CustomEvent('sync_settings_updated', { detail: { preferences: remotePrefs } }));
                }
             }
          }
      })
      .subscribe((status) => {
         if (status === 'SUBSCRIBED') {
           console.log('[Realtime] Subscriptions established successfully.');
         }
      });
  },
  
  stopRealtime() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }
};

window.addEventListener('online', () => {
  const checkStatus = async () => {
    if (await metadataStore.getItem('migration_status') === 'completed') {
      syncEngine.syncUp();
      syncEngine.syncDown();
    }
  };
  checkStatus();
});
