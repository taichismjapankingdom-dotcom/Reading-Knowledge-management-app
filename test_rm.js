import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import sectionize from 'remark-sectionize';
import { renderToString } from 'react-dom/server';
import React from 'react';

const markdown = `## Heading

This is **bold** text.
`;

const html = renderToString(React.createElement(ReactMarkdown, { 
  children: markdown, 
  remarkPlugins: [sectionize, remarkGfm] 
}));

console.log(html);
