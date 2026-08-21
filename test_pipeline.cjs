const fs = require('fs');
const { marked } = require('marked');

marked.use({
  tokenizer: {
    code(src) {
      return undefined;
    }
  }
});

let text = fs.readFileSync('dump_raw.txt', 'utf8');
text = text.replace(/\\n/g, '\n');

const tokens = marked.lexer(text);

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

const rootNodes = groupTokensToHierarchy(tokens);
let htmlChunks = [];

function renderChildren(children) {
  let currentTokens = [];
  const flushTokens = () => {
    if (currentTokens.length > 0) {
      currentTokens.links = tokens.links;
      htmlChunks.push(marked.parser(currentTokens));
      currentTokens = [];
    }
  };

  children.forEach((child) => {
    if (child.token && child.token.type === 'heading') {
      flushTokens();
      htmlChunks.push('<h2>' + child.token.text + '</h2>');
      renderChildren(child.children);
    } else {
      currentTokens.push(child);
    }
  });
  flushTokens();
}

renderChildren(rootNodes);

const fullHtml = htmlChunks.join('\n');
const lines = fullHtml.split('\n');
let failed = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('**')) {
    console.log('FAILED TO PARSE ** ON LINE:', lines[i]);
    failed = true;
  }
}
if (!failed) console.log("ALL BOLD RENDERED PERFECTLY IN CUSTOM PIPELINE!");
