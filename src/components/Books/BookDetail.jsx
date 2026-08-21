import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, PenTool, Maximize, Minimize, MoreHorizontal, Trash2, Camera } from 'lucide-react';
import MarkdownEditor from '../Editor/MarkdownEditor';
import FavoriteQuotes from '../Editor/FavoriteQuotes';
import NewWords from '../Editor/NewWords';
import { useNotes } from '../../hooks/useNotes';
import { deleteBook } from '../../hooks/useBooks';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTranslation } from 'react-i18next';
import BookCoverPlaceholder from './BookCoverPlaceholder';
import localforage from 'localforage';
import './BookDetail.css';

const learningTemplate = `## Summary

## Important Concepts

## Things I Learnt
`;

const novelTemplate = `## Summary

## Themes

## Scenes I Loved
`;

export default function BookDetail({ book, onClose, onMove }) {
  const { t } = useTranslation();
  const [editorMode, setEditorMode] = useState('hidden'); // 'hidden', 'half', 'full'
  const { note, loading, saveNote } = useNotes(book?.id);
  const noteTheme = useSettingsStore(s => s.noteTheme) || 'default';
  
  const defaultTemplate = book?.type === 'learning' ? learningTemplate : novelTemplate;
  const [localNote, setLocalNote] = useState({ markdown: defaultTemplate, favoriteQuotes: [], newWords: [] });

  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Local state for immediate cover updates
  const [displayCover, setDisplayCover] = useState(book?.coverUrl);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    setDisplayCover(book?.coverUrl);
  }, [book?.coverUrl]);

  // Track if we've successfully loaded the remote note at least once
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only synchronize global note into local state if we are NOT actively editing.
    // This prevents the caret jump caused by autosave or remote sync overwriting the active editor.
    if (!loading && note) {
      if (editorMode === 'hidden' || !hasInitialized) {
        // If the remote note is completely empty, keep the default template
        if (!note.markdown && !note.favoriteQuotes?.length && !note.newWords?.length) {
          // Do nothing, keep defaultTemplate
        } else {
          setLocalNote(note);
        }
        setHasInitialized(true);
      }
    }
  }, [note, loading, editorMode, hasInitialized]);

  const handleMarkdownChange = (newMarkdown) => {
    const updated = { ...localNote, markdown: newMarkdown };
    setLocalNote(updated);
    saveNote(updated);
  };

  const handleQuotesChange = (newQuotes) => {
    const updated = { ...localNote, favoriteQuotes: newQuotes };
    setLocalNote(updated);
    saveNote(updated);
  };

  const handleWordsChange = (newWords) => {
    const updated = { ...localNote, newWords: newWords };
    setLocalNote(updated);
    saveNote(updated);
  };

  const handleDelete = async () => {
    if (book) {
      await deleteBook(book.id);
      onClose(); // Parent will refresh data implicitly or manually if needed
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result;
        setDisplayCover(base64data);
        setShowOptions(false);
        
        // Save to store immediately
        const allBooks = (await localforage.getItem('all_books')) || [];
        const updatedBooks = allBooks.map(b => {
          if (b.id === book.id) {
            return { ...b, coverUrl: base64data, coverSource: 'Manual Upload', coverTimestamp: new Date().toISOString() };
          }
          return b;
        });
        await localforage.setItem('all_books', updatedBooks);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to read image", err);
    }
  };

  if (!book) return null;

  return (
    <motion.div 
      className="book-detail-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="book-detail-content glass-panel"
        layoutId={`book-card-${book.id}`}
        initial={{ y: 50, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 50, scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="detail-top-bar">
          <div className="top-bar-left">
            <button className="icon-btn glass-btn" onClick={onClose}>
              <ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} /> 
              <span className="action-label">{t('common.back')}</span>
            </button>
          </div>
          
          <div className="top-bar-center">
             <button className="glass-btn primary edit-note-btn" onClick={() => setEditorMode('half')}>
               <PenTool size={16} /> <span className="action-label">{t('notes.edit')}</span>
             </button>
          </div>

          <div className="top-bar-right">
            <button className="icon-btn glass-btn" onClick={() => setShowOptions(!showOptions)}>
              <MoreHorizontal size={24} />
            </button>
          </div>
          
          <AnimatePresence>
            {showOptions && (
                <motion.div 
                  className="options-menu glass-panel"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                <button className="menu-item" onClick={() => fileInputRef.current?.click()}>
                  <Camera size={16} /> {t('book_detail.change_cover')}
                </button>
                <button className="menu-item destructive" onClick={() => { setShowDeleteConfirm(true); setShowOptions(false); }}>
                  <Trash2 size={16} /> {t('book_detail.delete_entry')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
        />

        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div 
              className="delete-confirm-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="delete-confirm-dialog glass-panel">
                <h3>{t('book_detail.delete_confirm_title')}</h3>
                <p>{t('book_detail.delete_confirm_desc')}</p>
                <div className="dialog-actions">
                  <button className="glass-btn" onClick={() => setShowDeleteConfirm(false)}>{t('book_detail.cancel')}</button>
                  <button className="glass-btn primary" style={{ background: '#ff3b30' }} onClick={handleDelete}>{t('book_detail.delete')}</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="book-detail-header">
          <div className="detail-cover-wrapper" layoutId={`book-cover-${book.id}`}>
            {displayCover ? (
              <img src={displayCover} alt={book.title} className="detail-cover" />
            ) : (
              <div className="detail-cover placeholder-wrapper">
                <BookCoverPlaceholder book={book} size="large" />
              </div>
            )}
          </div>
          <div className="detail-info">
            <h2>{book.title}</h2>
            <p className="detail-author">{book.author}</p>
            
            <div className="detail-stats">
              <div className="detail-stat-box">
                <span className="stat-label">{t('book_detail.progress')}</span>
                <span className="stat-value">{book.progress}%</span>
              </div>
              <div className="detail-stat-box">
                <span className="stat-label">{t('book_detail.type')}</span>
                <span className="stat-value" style={{ textTransform: 'capitalize' }}>{book.type}</span>
              </div>
            </div>
            
            <div className="detail-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
               <button className="read-btn" onClick={() => {}}>{t('book_detail.continue_reading')} <ChevronRight size={16} /></button>
               {onMove && book.status !== 'reading' && (
                 <button className="glass-btn" onClick={() => onMove(book, 'reading')}>{t('book_detail.move_to_reading')}</button>
               )}
               {onMove && book.status !== 'library' && (
                 <button className="glass-btn" onClick={() => onMove(book, 'library')}>{t('book_detail.move_to_library')}</button>
               )}
               {onMove && book.status !== 'queue' && (
                 <button className="glass-btn" onClick={() => onMove(book, 'queue')}>{t('book_detail.move_to_queue')}</button>
               )}
            </div>
          </div>
        </div>

        <div className="book-detail-notes">
          <div className="notes-header">
            <h3>{t('notes.insights')}</h3>
          </div>
          
          <div className="notes-preview-container">
            {loading ? (
              <div style={{ color: 'var(--text-secondary)' }}>{t('book_detail.loading_notes')}</div>
            ) : (
              <div className="notes-preview-fade">
                <MarkdownEditor 
                  initialValue={localNote.markdown}
                  mode="preview"
                >
                  <FavoriteQuotes quotes={localNote.favoriteQuotes} mode="preview" />
                  <NewWords words={localNote.newWords} mode="preview" />
                </MarkdownEditor>
                <div className="fade-overlay"></div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {editorMode !== 'hidden' && (
          <motion.div 
            className={`editor-workspace note-theme-${noteTheme} ${editorMode === 'full' ? 'full-screen' : 'half-screen'}`}
            layout
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 250, damping: 25 }}
          >
            <div className="workspace-header">
              <h3>{book.title} - {t('book_detail.notes_title')}</h3>
              <div className="workspace-actions">
                <button 
                  className="icon-btn" 
                  onClick={() => setEditorMode(editorMode === 'full' ? 'half' : 'full')}
                >
                  {editorMode === 'full' ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
                <button 
                  className="icon-btn close" 
                  onClick={() => setEditorMode('hidden')}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="workspace-editor-area scrollable-workspace">
              <MarkdownEditor 
                initialValue={localNote.markdown}
                onChange={handleMarkdownChange}
                mode="live"
              >
                <FavoriteQuotes quotes={localNote.favoriteQuotes} onChange={handleQuotesChange} />
                <NewWords words={localNote.newWords} onChange={handleWordsChange} />
              </MarkdownEditor>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
