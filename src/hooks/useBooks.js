import { useState, useEffect, useCallback } from 'react';
import localforage from 'localforage';
import { resolveCover, isCoverCacheValid } from '../utils/coverResolver';
import { syncEngine } from '../lib/syncEngine';

localforage.config({
  name: 'ReadingKnowledgeApp',
  storeName: 'books'
});

export function useBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      
      let localData = await localforage.getItem('all_books');
      
      // MIGRATION: Restore old books from previous version
      if (!localData || localData.length === 0) {
        const reading = (await localforage.getItem('books_reading')) || [];
        const library = (await localforage.getItem('books_library')) || [];
        const queue = (await localforage.getItem('books_queue')) || [];
        
        const combined = [...reading, ...library, ...queue];
        if (combined.length > 0) {
          console.log("Migrating previously registered books to new Unified Bookshelf...");
          await localforage.setItem('all_books', combined);
          localData = combined;
        }
      }
      
      const booksList = localData || [];
      setBooks(booksList);
      kickoffCoverResolution(booksList);
    } catch (err) {
      console.warn("Fetch failed, using local.", err);
      const localData = await localforage.getItem('all_books');
      setBooks(localData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const kickoffCoverResolution = async (booksList) => {
    let updated = false;
    const newBooks = [...booksList];
    
    for (let i = 0; i < newBooks.length; i++) {
      const b = newBooks[i];
      if (b.isbn && (!b.coverUrl || !isCoverCacheValid(b.coverTimestamp))) {
        try {
          const resolved = await resolveCover(b.isbn);
          if (resolved) {
            newBooks[i] = { 
              ...b, 
              coverUrl: resolved.url, 
              coverSource: resolved.source, 
              coverTimestamp: resolved.timestamp 
            };
            updated = true;
            setBooks([...newBooks]); // Trigger progressive re-render
          } else if (!b.coverTimestamp || b.coverSource !== 'None') {
            // Mark attempted and failed so we don't spam APIs immediately
            newBooks[i] = { ...b, coverTimestamp: new Date().toISOString(), coverSource: 'None' };
            updated = true;
            setBooks([...newBooks]);
          }
        } catch (e) {
          console.warn("Cover resolution error:", e);
        }
      }
    }
    if (updated) {
      await localforage.setItem('all_books', newBooks);
    }
  };

  const repairMissingCovers = async () => {
    let localData = await localforage.getItem('all_books');
    if (!localData) return;
    
    let updated = false;
    const newBooks = localData.map(b => {
      // If it doesn't have a coverUrl but has an ISBN, reset it to try again
      if (!b.coverUrl && b.isbn) {
        updated = true;
        return { ...b, coverTimestamp: null, coverSource: null };
      }
      return b;
    });
    
    if (updated) {
      await localforage.setItem('all_books', newBooks);
      setBooks(newBooks);
      kickoffCoverResolution(newBooks);
    }
  };

  useEffect(() => {
    fetchBooks();

    const handleSync = () => fetchBooks();
    window.addEventListener('sync_books_updated', handleSync);
    return () => window.removeEventListener('sync_books_updated', handleSync);
  }, [fetchBooks]);

  return { books, loading, refresh: fetchBooks, repairMissingCovers };
}

export const deleteBook = async (bookId) => {
  const currentBooks = (await localforage.getItem('all_books')) || [];
  const updatedBooks = currentBooks.filter(b => b.id !== bookId);
  await localforage.setItem('all_books', updatedBooks);

  // We don't have a hard delete in sync engine yet, so we could mark as deleted_at
  await syncEngine.queueMutation('books', 'UPDATE', { id: bookId, deleted_at: new Date().toISOString() }, bookId);
};

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export const addBookToStore = async (book, status) => {
  // Google Books API returns string IDs. We MUST use UUIDs for Supabase.
  const validId = (book.id && isUUID(book.id)) ? book.id : crypto.randomUUID();
  const newBook = { ...book, status, id: validId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  
  // Save locally
  const currentBooks = (await localforage.getItem('all_books')) || [];
  const updatedBooks = currentBooks.filter(b => b.id !== newBook.id);
  updatedBooks.unshift(newBook);
  await localforage.setItem('all_books', updatedBooks);
  
  await syncEngine.queueMutation('books', 'UPSERT', newBook, newBook.id);
};

export const updateBookStatus = async (book, newStatus) => {
  if (book.status === newStatus) return;

  const updatedBook = { ...book, status: newStatus, updated_at: new Date().toISOString() };
  
  // Local storage
  const currentBooks = (await localforage.getItem('all_books')) || [];
  const updatedBooks = currentBooks.map(b => b.id === book.id ? updatedBook : b);
  await localforage.setItem('all_books', updatedBooks);

  await syncEngine.queueMutation('books', 'UPSERT', updatedBook, updatedBook.id);
};
