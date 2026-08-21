import React from 'react';
import { useTranslation } from 'react-i18next';
import './BookCoverPlaceholder.css';

export default function BookCoverPlaceholder({ book, size = 'normal' }) {
  const { t } = useTranslation();
  if (!book) return null;
  const isSearching = !book.coverUrl && book.isbn && !book.coverSource;

  return (
    <div className={`book-cover-placeholder ${size} ${isSearching ? 'searching' : ''}`}>
      {isSearching ? (
        <div className="shimmer-wrapper">
          <div className="shimmer"></div>
          <div className="searching-text">{t('book_card.looking_for_cover')}</div>
        </div>
      ) : (
        <>
          <div className="placeholder-content">
            <h4 className="placeholder-title">{book.title}</h4>
            <p className="placeholder-author">{book.author}</p>
          </div>
          <div className="spine-highlight"></div>
        </>
      )}
    </div>
  );
}
