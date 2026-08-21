import localforage from 'localforage';

// Ensure default config matches useBooks
localforage.config({
  name: 'ReadingKnowledgeApp',
  storeName: 'books'
});

const notesStore = localforage.createInstance({
  name: 'ReadingKnowledgeApp',
  storeName: 'notes'
});

/**
 * Generates a structured snapshot of all user data.
 */
export async function generateBackupData() {
  const backup = {
    version: 1,
    timestamp: new Date().toISOString(),
    data: {
      books: [],
      notes: {},
      settings: null
    }
  };

  // 1. Gather Books
  backup.data.books = (await localforage.getItem('all_books')) || [];

  // 2. Gather Notes
  const notes = {};
  await notesStore.iterate((value, key) => {
    notes[key] = value;
  });
  backup.data.notes = notes;

  // 3. Gather Settings (Zustand persist store)
  const settingsStr = localStorage.getItem('readmind-settings');
  if (settingsStr) {
    try {
      backup.data.settings = JSON.parse(settingsStr);
    } catch (e) {
      console.warn("Failed to parse settings", e);
    }
  }

  return backup;
}

/**
 * Triggers a download of the current library as a JSON file.
 */
export async function exportLibrary() {
  const backup = await generateBackupData();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `readmind_backup_${dateStr}.json`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

/**
 * Validates the schema of a parsed backup object.
 */
export function validateBackup(backup) {
  if (!backup || typeof backup !== 'object') return false;
  if (backup.version !== 1) return false;
  if (!backup.data || typeof backup.data !== 'object') return false;
  if (!Array.isArray(backup.data.books)) return false;
  if (typeof backup.data.notes !== 'object') return false;
  // settings can be null or an object, which is fine
  return true;
}

/**
 * Replaces the local database with the contents of the backup.
 * It will trigger a pre-import backup download just in case.
 */
export async function importLibrary(fileContent) {
  let backup;
  try {
    backup = JSON.parse(fileContent);
  } catch (e) {
    throw new Error("Invalid JSON format. Please ensure you selected a valid Readmind backup file.");
  }

  if (!validateBackup(backup)) {
    throw new Error("Invalid or incompatible backup format. The file may be corrupted or from an unsupported version.");
  }

  // 1. Automatic Pre-Import Backup
  const currentBackup = await generateBackupData();
  
  // If there's literally no data (empty books and notes), maybe we don't need a pre-backup,
  // but it's safer to always do it. We'll only generate the file if there's *some* data to avoid annoying the user on a truly fresh install.
  const hasExistingData = currentBackup.data.books.length > 0 || Object.keys(currentBackup.data.notes).length > 0;
  
  if (hasExistingData) {
    const preImportBlob = new Blob([JSON.stringify(currentBackup, null, 2)], { type: 'application/json' });
    const preImportUrl = URL.createObjectURL(preImportBlob);
    const a = document.createElement('a');
    a.href = preImportUrl;
    a.download = `readmind_pre_import_backup_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(preImportUrl);
    
    // Give the browser a tiny moment to process the download
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 2. Perform All-or-nothing Import
  try {
    // Write Books
    await localforage.setItem('all_books', backup.data.books);

    // Write Notes (clear existing then add new to avoid phantom orphaned notes)
    await notesStore.clear();
    for (const [key, value] of Object.entries(backup.data.notes)) {
      await notesStore.setItem(key, value);
    }

    // Write Settings
    if (backup.data.settings) {
      localStorage.setItem('readmind-settings', JSON.stringify(backup.data.settings));
    }

    return true; // Success
  } catch (err) {
    // 3. Rollback on failure
    console.error("Import failed, attempting rollback...", err);
    try {
       await localforage.setItem('all_books', currentBackup.data.books);
       await notesStore.clear();
       for (const [key, value] of Object.entries(currentBackup.data.notes)) {
         await notesStore.setItem(key, value);
       }
       if (currentBackup.data.settings) {
         localStorage.setItem('readmind-settings', JSON.stringify(currentBackup.data.settings));
       }
    } catch (rollbackErr) {
       console.error("Critical error: Rollback also failed!", rollbackErr);
    }

    throw new Error("Failed to write imported data to the database. Your local state has been preserved.");
  }
}
