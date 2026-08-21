import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './StructuredSections.css';

export default function FavoriteQuotes({ quotes = [], onChange, mode = 'live' }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);

  const addQuote = () => {
    const newQuote = { id: crypto.randomUUID(), text: '', page: '', order: quotes.length };
    onChange([...quotes, newQuote]);
  };

  const updateQuote = (id, field, value) => {
    onChange(quotes.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const deleteQuote = (id) => {
    onChange(quotes.filter(q => q.id !== id));
  };

  // Drag and drop could be implemented here, but we'll stick to a simple UI for now
  // to ensure mobile-friendly behavior as requested.

  if (mode === 'preview') {
    if (!quotes || quotes.length === 0) return null;
    
    return (
      <div className={`foldable-section level-2 ${isOpen ? 'open' : 'closed'}`}>
        <div className="section-header" onClick={() => setIsOpen(!isOpen)}>
          <span className="section-chevron">
             {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </span>
          <div className="section-title-rendered">
            <h2 style={{ margin: 0, color: 'var(--note-heading-predefined)' }}>{t('notes.sections.favorite_quotes', 'Favorite Quotes')}</h2>
          </div>
        </div>
        {isOpen && (
          <div className="section-content">
            {quotes.map((quote) => (
              <blockquote key={quote.id} style={{ margin: '16px 0', padding: '0 16px', borderLeft: '4px solid var(--note-accent)', color: 'var(--note-text-primary)', fontStyle: 'italic' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '1.15em', lineHeight: '1.6' }}>"{quote.text}"</p>
                {quote.page && <footer style={{ fontSize: '0.9em', color: 'var(--note-muted)' }}>— {quote.page}</footer>}
              </blockquote>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`note-section-accordion ${isOpen ? 'open' : 'closed'}`}>
      <div className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="accordion-icon">
           {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
        <span className="accordion-title">{t('notes.sections.favorite_quotes', 'Favorite Quotes')}</span>
      </div>
      
      <div className={`accordion-content-wrapper ${isOpen ? 'expanded' : 'collapsed'}`}>
         <div className="accordion-content structured-content">
            {quotes.length === 0 ? (
              <p className="empty-prompt">{t('notes.empty_quotes', 'No favorite quotes yet. Add one below.')}</p>
            ) : (
              <div className="cards-container">
                {quotes.map((quote) => (
                  <div key={quote.id} className="structured-card">
                    <textarea 
                      className="card-textarea"
                      placeholder={t('notes.quote_placeholder', '“A memorable passage...”')}
                      value={quote.text}
                      onChange={(e) => updateQuote(quote.id, 'text', e.target.value)}
                    />
                    <div className="card-footer">
                      <input 
                        type="text" 
                        className="card-input"
                        placeholder={t('notes.page_placeholder', 'Page / Location')}
                        value={quote.page}
                        onChange={(e) => updateQuote(quote.id, 'page', e.target.value)}
                      />
                      <button className="icon-btn delete-card" onClick={() => deleteQuote(quote.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button className="add-card-btn" onClick={addQuote}>
              <Plus size={16} /> {t('notes.add_quote', 'Add Quote')}
            </button>
         </div>
      </div>
    </div>
  );
}
