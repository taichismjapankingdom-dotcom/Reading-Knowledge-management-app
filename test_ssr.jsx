import React from 'react';
import { renderToString } from 'react-dom/server';
import MarkdownEditor from './src/components/Editor/MarkdownEditor.jsx';

const html = renderToString(
  <MarkdownEditor 
    initialValue={"## Important Concepts\n\nThis is **important**.\n\nこれは **重要です**。\n\n### Details\n\n*italic text*\n\n~~deleted text~~\n\n> quotation\n\n- item one\n- item two\n\n1. numbered item\n\n[Example](https://example.com)"} 
    mode="preview" 
  />
);

console.log("HTML Output:");
console.log(html);
console.log("\n=================\n");
console.log("Contains '**'? ", html.includes('**'));
console.log("Contains '## '? ", html.includes('## '));
console.log("Contains 'Important Concepts'? ", html.includes('Important Concepts'));
console.log("Contains 'section-header'? ", html.includes('section-header'));
console.log("Contains '<strong>important</strong>'? ", html.includes('<strong>important</strong>'));
console.log("Contains '<del>deleted text</del>'? ", html.includes('<del>deleted text</del>'));
