import React from 'react';
import { motion } from 'framer-motion';
import { Clock, BookOpen, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './BookCard.css';

export default function BookCard({ book, onClick }) {
  const { t } = useTranslation();
  // progress is 0-100
  const progressWidth = `${book.progress}%`;

  return (
    <motion.div 
      className="book-card glass-panel glass-hover-glow"
      onClick={() => onClick(book)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      layoutId={`book-card-${book.id}`}
    >
      <div className="book-cover-container">
        <motion.img 
          src={book.coverUrl} 
          alt={book.title} 
          className="book-cover"
          layoutId={`book-cover-${book.id}`}
        />
        {book.progress > 0 && book.progress < 100 && (
          <div className="progress-bar-bg">
            <motion.div 
              className="progress-bar-fill" 
              initial={{ width: 0 }}
              animate={{ width: progressWidth }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      <div className="book-info">
        <h3 className="book-title text-truncate">{book.title}</h3>
        <p className="book-author text-truncate">{book.author}</p>
        
        <div className="book-stats">
          <div className="stat-item" title={t('book_card.reading_streak')}>
            <TrendingUp size={14} />
            <span>{book.streak} {t('book_card.days')}</span>
          </div>
          <div className="stat-item" title={t('book_card.estimated_time_remaining')}>
            <Clock size={14} />
            <span>{book.etr}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
