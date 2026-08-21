import React, { useRef, useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import localforage from 'localforage';
import '../components/Editor/MarkdownEditor.css';
import FoldableMarkdown from '../components/Editor/FoldableMarkdown';

export default function DiagnosticMarkdown() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState('');
  
  useEffect(() => {
    const notesStore = localforage.createInstance({ name: 'ReadingKnowledgeApp', storeName: 'notes' });
    const loadNotes = async () => {
      const allNotes = [];
      await notesStore.iterate((value, key) => {
        allNotes.push({ key, value });
      });
      setNotes(allNotes);
      
      const targetNote = allNotes.find(n => n.value?.markdown?.includes('DXで経営戦略') || n.value?.markdown?.includes('**'));
      if (targetNote) {
        setSelectedNote(targetNote.value.markdown || targetNote.value);
      } else if (allNotes.length > 0) {
        setSelectedNote(allNotes[0].value.markdown || allNotes[0].value);
      }
    };
    loadNotes();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', background: '#fff', color: '#000', minHeight: '100vh' }}>
      <h1>Diagnostic Markdown Renderer</h1>
      <select onChange={e => setSelectedNote(e.target.value)} style={{ width: '100%', marginBottom: 20 }}>
        {notes.map(n => (
          <option key={n.key} value={typeof n.value === 'string' ? n.value : n.value.markdown}>
            {n.key}
          </option>
        ))}
      </select>
      <hr />
      
      <h2>1. Without Folding (Standard ReactMarkdown equivalent)</h2>
      <div className="custom-md-editor-container view-mode theme-default">
        <div 
          className="wmde-markdown" 
          style={{ marginTop: '24px' }} 
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(selectedNote || '', { gfm: true, breaks: true })) }}
        />
      </div>

      <h2>2. With Folding (Current Pipeline)</h2>
      <div className="custom-md-editor-container view-mode theme-default">
        <FoldableMarkdown markdown={selectedNote || ''} />
      </div>

      <div style={{ marginTop: '48px', opacity: 0.5 }}>
        <h2>Raw String Passed To Renderer:</h2>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{selectedNote}</pre>
      </div>
    </div>
  );
}
