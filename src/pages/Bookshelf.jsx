import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search as SearchIcon } from 'lucide-react';
import BookGrid from '../components/Books/BookGrid';
import BookDetail from '../components/Books/BookDetail';
import AddBookModal from '../components/Books/AddBookModal';
import { useBooks, addBookToStore, updateBookStatus } from '../hooks/useBooks';
import { useTranslation } from 'react-i18next';
import './Bookshelf.css';

const TABS = [
  { id: 'all', label: 'bookshelf.tabs.all' },
  { id: 'reading', label: 'bookshelf.tabs.reading' },
  { id: 'library', label: 'bookshelf.tabs.read' },
  { id: 'queue', label: 'bookshelf.tabs.queue' }
];

export default function Bookshelf() {
  const { t } = useTranslation();
  const { books, loading, refresh } = useBooks();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedBook, setSelectedBook] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBooks = useMemo(() => {
    let result = books;
    if (activeTab !== 'all') {
      result = result.filter(b => b.status === activeTab);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(q) || 
        b.author.toLowerCase().includes(q)
      );
    }
    return result;
  }, [books, activeTab, searchQuery]);

  const handleAddBook = async (book) => {
    await addBookToStore(book, book.status);
    refresh();
  };

  const handleMoveBook = async (book, newStatus) => {
    await updateBookStatus(book, newStatus);
    setSelectedBook(null);
    refresh();
  };

  return (
    <div className="bookshelf-page">
      <header className="bookshelf-header glass-panel">
        <div className="header-top">
          <h1 className="bookshelf-title">{t('bookshelf.title')}</h1>
          <button className="glass-btn primary add-book-btn" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={18} className="add-icon" />
            <span className="add-label-full">{t('common.add_book')}</span>
            <span className="add-label-short">{t('common.add')}</span>
          </button>
        </div>

        <div className="header-controls">
          <div className="glass-tabs">
            {TABS.map(tab => {
              const count = tab.id === 'all' 
                ? books.length 
                : books.filter(b => b.status === tab.id).length;
                
              return (
                <button 
                  key={tab.id}
                  className={`glass-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {t(tab.label)} <span className="tab-count">{count}</span>
                  {activeTab === tab.id && (
                    <motion.div className="tab-indicator" layoutId="activeTabIndicator" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="local-search">
            <SearchIcon size={16} />
            <input 
              type="text" 
              placeholder={t('common.search')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="bookshelf-content">
        {loading ? (
          <div className="empty-state">{t('bookshelf.empty.loading')}</div>
        ) : filteredBooks.length > 0 ? (
          <BookGrid books={filteredBooks} onBookClick={setSelectedBook} />
        ) : (
          <div className="empty-state glass-panel">
            {activeTab === 'reading' && <p>{t('bookshelf.empty.reading')}</p>}
            {activeTab === 'queue' && <p>{t('bookshelf.empty.queue')}</p>}
            {activeTab === 'library' && <p>{t('bookshelf.empty.library')}</p>}
            {activeTab === 'all' && <p>{t('bookshelf.empty.all')}</p>}
            <button className="glass-btn primary mt-4" onClick={() => setIsAddModalOpen(true)}>
              {t('common.add_a_book')}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedBook && (
          <BookDetail 
            book={selectedBook} 
            onClose={() => setSelectedBook(null)} 
            onMove={handleMoveBook}
          />
        )}
      </AnimatePresence>

      <AddBookModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddBook} 
      />
    </div>
  );
}
