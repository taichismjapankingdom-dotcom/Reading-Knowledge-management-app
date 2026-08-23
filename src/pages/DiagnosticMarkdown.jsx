import React from 'react';
import FoldableMarkdown from '../components/Editor/FoldableMarkdown';

export default function DiagnosticMarkdown() {
  const testMarkdown = `
# Hello World

This is a diagnostic page to test **typography** and *styling*.

## Section 1: Formatting
- List item 1
- List item 2

> "This is a blockquote demonstrating aesthetic styling in reading mode."
> — Author

### Section 2: Code
\`\`\`javascript
function hello() {
  console.log("Hello, Debugging!");
}
\`\`\`

Here is a paragraph with [a link](https://example.com) to test anchor colors.
`;

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '32px', 
      background: 'var(--bg-overlay, #000)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-reading)',
      transition: 'background 0.5s ease, color 0.5s ease'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px', marginBottom: '32px' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem' }}>Typography Diagnostic</h1>
            <p style={{ margin: 0, opacity: 0.7, color: 'var(--text-secondary)' }}>Testing the exact components and aesthetic styles of the reading mode.</p>
          </div>
          
          <div className="custom-md-editor-container view-mode theme-default" style={{ background: 'transparent' }}>
            <FoldableMarkdown markdown={testMarkdown} />
          </div>
        </div>
      </div>
    </div>
  );
}
