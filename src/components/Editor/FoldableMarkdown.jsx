import React, { useState, useMemo } from 'react';
import { marked, Marked } from 'marked';
import DOMPurify from 'dompurify';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Create a dedicated Marked instance to avoid global pollution/HMR issues
const customMarked = new Marked();
customMarked.use({
  tokenizer: {
    code(src) {
      return undefined;
    }
  }
});

function groupTokensToHierarchy(tokens) {
  const root = { depth: 0, children: [] };
  const stack = [root];

  tokens.forEach(token => {
    if (token.type === 'heading') {
      const newNode = { token, children: [] };
      while (stack.length > 1 && stack[stack.length - 1].token.depth >= token.depth) {
        stack.pop();
      }
      stack[stack.length - 1].children.push(newNode);
      stack.push(newNode);
    } else {
      stack[stack.length - 1].children.push(token);
    }
  });

  return root.children;
}

function renderChildren(children, links = {}, expandAllSignal) {
  const elements = [];
  let currentTokens = [];

  const flushTokens = (idx) => {
    if (currentTokens.length > 0) {
      // Create a proper ListList object if needed by marked parser, but passing array works in marked.parser
      currentTokens.links = links;
      const html = DOMPurify.sanitize(customMarked.parser(currentTokens));
      elements.push(<div key={`content-${idx}`} dangerouslySetInnerHTML={{ __html: html }} className="markdown-block" />);
      currentTokens = [];
    }
  };

  children.forEach((child, idx) => {
    if (child.token && child.token.type === 'heading') {
      flushTokens(idx);
      elements.push(<FoldableSection key={`heading-${idx}`} node={child} links={links} expandAllSignal={expandAllSignal} />);
    } else {
      currentTokens.push(child);
    }
  });

  flushTokens('end');

  return elements;
}

function FoldableSection({ node, links, expandAllSignal }) {
  const [isExpanded, setIsExpanded] = useState(expandAllSignal ?? true);

  React.useEffect(() => {
    if (expandAllSignal !== undefined) {
      setIsExpanded(expandAllSignal);
    }
  }, [expandAllSignal]);

  // Parse the heading's internal inline tokens directly, or use parseInline on the text.
  // Using parseInline is safe here as it's a single line string.
  const headingHtml = DOMPurify.sanitize(customMarked.parseInline(node.token.text, { gfm: true, breaks: true }));

  return (
    <div className={`foldable-section depth-${node.token.depth}`}>
      <div 
        className="foldable-heading-wrapper"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="foldable-indicator">
          <ChevronRight 
            size={18} 
            style={{ 
              transition: 'transform 0.2s ease', 
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' 
            }}
          />
        </span>
        <div 
          className="foldable-heading-content" 
          dangerouslySetInnerHTML={{ __html: headingHtml }} 
        />
      </div>
      
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.2 }}
            className="foldable-content"
          >
            {renderChildren(node.children, links, expandAllSignal)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FoldableMarkdown({ markdown, expandAllSignal }) {
  if (!markdown) return null;

  // Aggressive runtime normalization:
  // 1. Strip escaped asterisks that legacy WYSIWYG editors inserted
  // 2. Strip zero-width spaces inserted by some IMEs
  // 3. Convert non-breaking spaces (U+00A0) to regular spaces so text can wrap
  const cleanMarkdown = markdown
    .replace(/\\\*/g, '*')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ');

  const tokens = customMarked.lexer(cleanMarkdown, { gfm: true, breaks: true });
  
  const links = tokens.links;
  const rootNodes = groupTokensToHierarchy(tokens);

  return (
    <div className="foldable-markdown-root">
      {renderChildren(rootNodes, links, expandAllSignal)}
    </div>
  );
}
