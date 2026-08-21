import React from 'react';
import { createRoot } from 'react-dom/client';
import MarkdownEditor from './src/components/Editor/MarkdownEditor.jsx';

const App = () => {
  return (
    <div style={{ padding: '20px', background: '#fff', color: '#000' }}>
      <h1>View Mode Test</h1>
      <MarkdownEditor 
        initialValue={"## Heading 2\n\nThis is **bold** text.\n\n-###**Invalid heading bold**\n\n### Valid Heading 3\n\nHello"} 
        mode="preview" 
      />
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
