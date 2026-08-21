import React from 'react';
import { motion } from 'framer-motion';
import BookCoverPlaceholder from './BookCoverPlaceholder';
import './BookGrid.css';

export default function BookGrid({ books, onBookClick }) {
  return (
    <div className="book-grid">
      {books.map((book, i) => (
        <motion.div 
          key={book.id}
          className="book-card glass-panel glass-hover-glow"
          onClick={() => onBookClick(book)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="book-cover-container">
            <div className="fallback-cover-wrapper">
              <BookCoverPlaceholder book={book} />
            </div>
            {book.coverUrl && (
              <img 
                src={book.coverUrl} 
                alt={book.title} 
                className="book-cover" 
                style={{ position: 'relative', zIndex: 1 }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
          </div>
          <div className="book-info">
            <h3 className="book-title">{book.title}</h3>
            <p className="book-author">{book.author}</p>
            {book.progress !== undefined && book.pages > 0 && (
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(book.progress / book.pages) * 100}%` }} 
                />
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
