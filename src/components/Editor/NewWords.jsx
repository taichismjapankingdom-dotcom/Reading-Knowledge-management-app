import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './StructuredSections.css';

export default function NewWords({ words = [], onChange, mode = 'live' }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);

  const addWord = () => {
    const newWord = { id: crypto.randomUUID(), word: '', meaning: '', page: '', order: words.length };
    onChange([...words, newWord]);
  };

  const updateWord = (id, field, value) => {
    onChange(words.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const deleteWord = (id) => {
    onChange(words.filter(w => w.id !== id));
  };

  if (mode === 'preview') {
    if (!words || words.length === 0) return null;
    
    return (
      <div className={`foldable-section level-2 ${isOpen ? 'open' : 'closed'}`}>
        <div className="section-header" onClick={() => setIsOpen(!isOpen)}>
          <span className="section-chevron">
             {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </span>
          <div className="section-title-rendered">
            <h2 style={{ margin: 0, color: 'var(--note-heading-predefined)' }}>{t('notes.sections.new_words', 'New Words')}</h2>
          </div>
        </div>
        {isOpen && (
          <div className="section-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
              {words.map((word) => (
                <div key={word.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <strong style={{ fontSize: '1.1em', color: 'var(--note-text-primary)' }}>{word.word}</strong>
                  <span style={{ color: 'var(--note-muted)' }}>{word.meaning}</span>
                  {word.page && <span style={{ fontSize: '0.85em', opacity: 0.7, color: 'var(--note-muted)' }}>— {word.page}</span>}
                </div>
              ))}
            </div>
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
        <span className="accordion-title">{t('notes.sections.new_words', 'New Words')}</span>
      </div>
      
      <div className={`accordion-content-wrapper ${isOpen ? 'expanded' : 'collapsed'}`}>
         <div className="accordion-content structured-content">
            {words.length === 0 ? (
              <p className="empty-prompt">{t('notes.empty_words', 'No new words recorded yet.')}</p>
            ) : (
              <div className="cards-container">
                {words.map((word) => (
                  <div key={word.id} className="structured-card word-card">
                    <input 
                      type="text"
                      className="card-input main-input"
                      placeholder={t('notes.word_placeholder', 'Word or Phrase')}
                      value={word.word}
                      onChange={(e) => updateWord(word.id, 'word', e.target.value)}
                    />
                    <textarea 
                      className="card-textarea small"
                      placeholder={t('notes.meaning_placeholder', 'Meaning / Note')}
                      value={word.meaning}
                      onChange={(e) => updateWord(word.id, 'meaning', e.target.value)}
                    />
                    <div className="card-footer">
                      <input 
                        type="text" 
                        className="card-input"
                        placeholder={t('notes.page_placeholder', 'Page / Location')}
                        value={word.page}
                        onChange={(e) => updateWord(word.id, 'page', e.target.value)}
                      />
                      <button className="icon-btn delete-card" onClick={() => deleteWord(word.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button className="add-card-btn" onClick={addWord}>
              <Plus size={16} /> {t('notes.add_word', 'Add Word')}
            </button>
         </div>
      </div>
    </div>
  );
}
