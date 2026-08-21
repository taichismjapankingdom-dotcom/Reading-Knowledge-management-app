import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import FoldableMarkdown from './FoldableMarkdown';

import { useSettingsStore } from '../../store/useSettingsStore';
import './MarkdownEditor.css';
import './NoteThemes.css';

const HARDCODED_TEST = `# Main Heading

## Important Concepts

This is **important**.

This is *italic*.

~~deleted~~

> quotation

- Item one
- Item two`;

export default function MarkdownEditor({ initialValue, placeholder, onChange, mode = 'live', children, bookId = 'unknown' }) {
  const noteTheme = useSettingsStore(s => s.noteTheme) || 'default';
  
  // Trace the exact runtime Note data as requested
  useEffect(() => {
    if (initialValue !== undefined) {
      console.log(`[MarkdownDebug] Book ID: ${bookId}`);
      console.log(`[MarkdownDebug] View renderer mounted: ${mode === 'preview' ? 'ReactMarkdown' : 'Plain Textarea'}`);
      console.log(`[MarkdownDebug] SOURCE MODE: ${mode === 'preview' ? 'HARDCODED' : 'ACTUAL NOTE'}`);
      console.log(`[MarkdownDebug] SOURCE STRING:`, mode === 'preview' ? HARDCODED_TEST : initialValue);
    }
  }, [mode, initialValue, bookId]);
  
  const [showDetails, setShowDetails] = useState(false);

  if (mode === 'preview') {
    return (
      <div className={`custom-md-editor-container view-mode theme-${noteTheme}`}>
        <div className="view-mode-toolbar" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button 
            className="glass-btn small" 
            onClick={() => setShowDetails(!showDetails)}
            style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {showDetails ? 'Headings only' : 'Show details'}
          </button>
        </div>
        <div className="wmde-markdown">
          <FoldableMarkdown markdown={initialValue || ''} expandAllSignal={showDetails} />
        </div>
        {children}
      </div>
    );
  }

  // Edit Mode: Single, perfectly accurate native-like editing area without drift overlays
  return (
    <div className={`custom-md-editor-container edit-mode theme-${noteTheme}`}>
      <div className="editor-main-textarea-wrapper">
        <textarea
          className="pure-markdown-textarea"
          value={initialValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Start writing...'}
          spellCheck={false}
        />
      </div>
      
      <div className="editor-structured-data">
         {children}
      </div>
    </div>
  );
}
