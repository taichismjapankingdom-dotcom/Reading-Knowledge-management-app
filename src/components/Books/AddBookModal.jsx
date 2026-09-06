import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Camera, Book as BookIcon, Loader2 } from 'lucide-react';
import { searchBooks, fetchByISBN } from '../../utils/metadataAPI';
import { Html5Qrcode } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useBooks } from '../../hooks/useBooks';
import './AddBookModal.css';

export default function AddBookModal({ isOpen, onClose, onAdd }) {
  const { t } = useTranslation();
  const { hasEntitlement: isPremium } = useEntitlement('unlimited_books');
  const { books } = useBooks();
  
  const [activeTab, setActiveTab] = useState('search');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const scannerRef = useRef(null);
  
  const [searchUsage, setSearchUsage] = useState(0);

  const isLimitReached = !isPremium && books.filter(b => !b.deleted_at).length >= 30;

  useEffect(() => {
    if (isOpen && !isPremium) {
      const fetchUsage = async () => {
        const { supabase } = await import('../../lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('usage_daily')
          .select('count')
          .eq('user_id', session.user.id)
          .eq('feature', 'book_search')
          .eq('day', today)
          .single();
          
        if (data) {
          setSearchUsage(data.count);
        }
      };
      fetchUsage();
    }
  }, [isOpen, isPremium]);

  // Cleanup scanner if modal closes or tab changes
  useEffect(() => {
    if (!isOpen || activeTab !== 'scan') {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current = null;
      }
    }
  }, [isOpen, activeTab]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    setResults([]);
    setSelectedBook(null);
    
    try {
      if (activeTab === 'search') {
        const res = await searchBooks(query);
        setResults(res);
      } else if (activeTab === 'isbn') {
        const res = await fetchByISBN(query.replace(/-/g, ''));
        setResults([res]);
      }
      
      // Increment local usage state if it succeeded (backend handles real enforcement)
      if (!isPremium) {
        setSearchUsage(prev => prev + 1);
      }
    } catch (err) {
      setError(err.message);
      if (err.message.includes('Search limit reached')) {
        window.dispatchEvent(new Event('open_upgrade_modal'));
      }
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    if (scannerRef.current) return;
    
    try {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          // Stop scanner on success
          await html5QrCode.stop();
          scannerRef.current = null;
          
          // Fetch by ISBN
          setQuery(decodedText);
          setActiveTab('isbn');
          
          setLoading(true);
          try {
            const res = await fetchByISBN(decodedText);
            setResults([res]);
            if (!isPremium) setSearchUsage(prev => prev + 1);
          } catch (err) {
            setError(err.message || t('add_book.scan_failed'));
            if (err.message && err.message.includes('Search limit reached')) {
              window.dispatchEvent(new Event('open_upgrade_modal'));
            }
          } finally {
            setLoading(false);
          }
        },
        (errorMessage) => {
          // Parse errors are frequent, ignore them
        }
      );
    } catch (err) {
      setError(t('add_book.scan_error'));
    }
  };

  useEffect(() => {
    if (activeTab === 'scan' && isOpen) {
      startScanner();
    }
  }, [activeTab, isOpen]);

  const handleConfirmAdd = (status) => {
    if (selectedBook) {
      onAdd({ ...selectedBook, status, progress: 0, streak: 0 });
      // Reset search state completely
      setQuery('');
      setResults([]);
      setSelectedBook(null);
      setError('');
      setActiveTab('search');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="add-book-overlay">
      <motion.div 
        className="add-book-modal glass-panel"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
      >
        <button className="close-modal-btn" onClick={onClose}><X size={20} /></button>
        <h2>{t('add_book.title')}</h2>
        
        <div className="modal-tabs">
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>{t('add_book.search')}</button>
          <button className={activeTab === 'isbn' ? 'active' : ''} onClick={() => setActiveTab('isbn')}>{t('add_book.isbn')}</button>
          <button className={activeTab === 'scan' ? 'active' : ''} onClick={() => setActiveTab('scan')}><Camera size={16} /> {t('add_book.scan')}</button>
        </div>

        {activeTab !== 'scan' && !selectedBook && (
          <>
            <form onSubmit={handleSearch} className="search-form">
              <input 
                type="text" 
                placeholder={activeTab === 'search' ? t('add_book.search_placeholder') : t('add_book.isbn_placeholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="glass-input"
              />
              <button type="submit" className="glass-btn primary" disabled={loading || (!isPremium && searchUsage >= 10)}>
                {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
              </button>
            </form>
            {!isPremium && (
              <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '8px', textAlign: 'right' }}>
                {searchUsage >= 10 
                  ? <span style={{ color: '#ff3b30' }}>{t('premium.search_limit_reached', 'Search limit reached today')}</span>
                  : t('premium.searches_remaining', '{{remaining}} of 10 searches remaining today', { remaining: Math.max(0, 10 - searchUsage) })
                }
              </div>
            )}
          </>
        )}

        {activeTab === 'scan' && !selectedBook && (
          <div className="scanner-container">
             <div id="reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }}></div>
             {error && <p className="error-text">{error}</p>}
          </div>
        )}

        {error && activeTab !== 'scan' && <p className="error-text">{error}</p>}

        {/* Results Grid */}
        {!selectedBook && results.length > 0 && (
          <div className="results-grid">
            {results.map((book) => (
              <div key={book.id} className="result-card glass-hover-glow" onClick={() => setSelectedBook(book)}>
                {book.coverUrl ? (
                   <img src={book.coverUrl} alt="Cover" />
                ) : (
                   <div className="placeholder-cover"><BookIcon size={32} /></div>
                )}
                <div className="result-info">
                  <h4>{book.title}</h4>
                  <p className="result-author">{book.author}</p>
                  <p className="result-meta" style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '4px' }}>
                    {book.publisher} {book.publicationYear ? `(${book.publicationYear})` : ''}
                  </p>
                  {book.isbn && <p className="result-isbn" style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '2px' }}>ISBN: {book.isbn}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Preview */}
        {selectedBook && (
          <div className="selected-preview">
            <div className="preview-header">
               {selectedBook.coverUrl ? (
                   <img src={selectedBook.coverUrl} alt="Cover" className="preview-cover" />
                ) : (
                   <div className="placeholder-cover large"><BookIcon size={48} /></div>
                )}
               <div className="preview-details">
                 <h3>{selectedBook.title}</h3>
                 <p className="author">{selectedBook.author}</p>
                 <p className="meta">{selectedBook.publicationYear} • {selectedBook.pages} {t('add_book.pages')}</p>
                 <button className="text-btn" onClick={() => setSelectedBook(null)}>{t('add_book.back_to_results')}</button>
               </div>
            </div>
            <div className="add-actions">
              <p>{t('add_book.add_to')}</p>
              
              {isLimitReached ? (
                <div style={{ padding: '16px', background: 'rgba(255,59,48,0.1)', borderRadius: '8px', border: '1px solid rgba(255,59,48,0.2)', marginBottom: '12px' }}>
                  <p style={{ color: '#ff3b30', fontWeight: 'bold', margin: '0 0 8px 0' }}>{t('premium.book_limit_reached', 'Free limit reached (30/30 books)')}</p>
                  <button className="primary-btn" onClick={() => { onClose(); window.dispatchEvent(new Event('open_upgrade_modal')); }}>
                    {t('premium.upgrade_btn', 'Upgrade to Premium')}
                  </button>
                </div>
              ) : (
                <div className="action-buttons">
                  <button className="glass-btn" onClick={() => handleConfirmAdd('reading')}>{t('add_book.add_reading')}</button>
                  <button className="glass-btn" onClick={() => handleConfirmAdd('queue')}>{t('add_book.add_queue')}</button>
                  <button className="glass-btn" onClick={() => handleConfirmAdd('library')}>{t('add_book.add_library')}</button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
