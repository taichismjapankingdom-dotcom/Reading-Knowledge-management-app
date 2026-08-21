import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Camera, Book as BookIcon, Loader2 } from 'lucide-react';
import { searchBooks, fetchByISBN } from '../../utils/metadataAPI';
import { Html5Qrcode } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import './AddBookModal.css';

export default function AddBookModal({ isOpen, onClose, onAdd }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'isbn', 'scan'
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const scannerRef = useRef(null);

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
      
      if (results.length === 0 && activeTab === 'search') {
          // Handled by empty results check in UI
      }
    } catch (err) {
      setError(err.message);
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
          } catch (err) {
            setError(t('add_book.scan_failed'));
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
          <form onSubmit={handleSearch} className="search-form">
            <input 
              type="text" 
              placeholder={activeTab === 'search' ? t('add_book.search_placeholder') : t('add_book.isbn_placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="glass-input"
            />
            <button type="submit" className="glass-btn primary" disabled={loading}>
              {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
            </button>
          </form>
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
                  <p>{book.author}</p>
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
              <div className="action-buttons">
                <button className="glass-btn" onClick={() => handleConfirmAdd('reading')}>{t('add_book.add_reading')}</button>
                <button className="glass-btn" onClick={() => handleConfirmAdd('queue')}>{t('add_book.add_queue')}</button>
                <button className="glass-btn" onClick={() => handleConfirmAdd('library')}>{t('add_book.add_library')}</button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
