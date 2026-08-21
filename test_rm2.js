import ReactMarkdown from 'react-markdown';
import MDEditor from '@uiw/react-md-editor';
import remarkGfm from 'remark-gfm';
import sectionize from 'remark-sectionize';
import { renderToString } from 'react-dom/server';
import React from 'react';

const markdown = `## Heading\n\nThis is **bold** text.`;

const html = renderToString(React.createElement(MDEditor.Markdown, { 
  source: markdown, 
  remarkPlugins: [sectionize, remarkGfm] 
}));

console.log(html);
