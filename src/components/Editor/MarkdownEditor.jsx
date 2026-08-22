import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import FoldableMarkdown from './FoldableMarkdown';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const noteTheme = useSettingsStore(s => s.noteTheme) || 'default';
  const noteGradientPreset = useSettingsStore(s => s.noteGradientPreset) || 'ocean';
  const woodType = useSettingsStore(s => s.woodType) || 'natural';
  
  const containerRef = React.useRef(null);

  // Diagnostic to locate exact overflowing element
  useEffect(() => {
    if (mode === 'preview' && containerRef.current) {
      setTimeout(() => {
        const root = containerRef.current;
        const overflowing = [...root.querySelectorAll('*')].filter(el => el.scrollWidth > el.clientWidth + 1);
        if (overflowing.length > 0) {
          console.error('[NoteOverflow] FOUND OVERFLOWING ELEMENTS:', overflowing.length);
          overflowing.forEach(el => {
            const style = getComputedStyle(el);
            console.log('[NoteOverflow] Element:', el.tagName, el.className, {
              clientWidth: el.clientWidth,
              scrollWidth: el.scrollWidth,
              text: el.textContent?.slice(0, 100),
              css: {
                display: style.display,
                whiteSpace: style.whiteSpace,
                wordBreak: style.wordBreak,
                overflowWrap: style.overflowWrap,
                width: style.width,
                minWidth: style.minWidth,
                maxWidth: style.maxWidth,
                overflowX: style.overflowX,
                padding: style.padding,
                margin: style.margin,
                boxSizing: style.boxSizing
              }
            });
            // highlight the exact offending element visually
            el.style.outline = '3px solid red';
          });
        }
      }, 500); // wait for render
    }
  }, [mode, initialValue]);
  
  const [showDetails, setShowDetails] = useState(false);

  const getThemeClasses = () => {
    let classes = `theme-${noteTheme}`;
    if (noteTheme === 'gradient') classes += ` gradient-preset-${noteGradientPreset}`;
    if (noteTheme === 'wood') classes += ` wood-type-${woodType}`;
    return classes;
  };

  if (mode === 'preview') {
    return (
      <div className={`custom-md-editor-container view-mode ${getThemeClasses()}`} ref={containerRef}>
        <div className="view-mode-toolbar" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button 
            className="glass-btn small" 
            onClick={() => setShowDetails(!showDetails)}
            style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {showDetails ? t('editor.headings_only', 'Headings only') : t('editor.show_details', 'Show details')}
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
    <div className={`custom-md-editor-container edit-mode ${getThemeClasses()}`}>
      <div className="editor-main-textarea-wrapper">
        <textarea
          className="pure-markdown-textarea"
          value={initialValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || t('editor.start_writing', 'Start writing...')}
          spellCheck={false}
        />
      </div>
      
      <div className="editor-structured-data">
         {children}
      </div>
    </div>
  );
}
