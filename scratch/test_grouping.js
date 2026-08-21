import { marked } from 'marked';

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

const md = `# Heading 1
Some text
## Heading 2
More text
### Heading 3
Even more text
## Another Heading 2
Final text`;

const tokens = marked.lexer(md);
const hierarchy = groupTokensToHierarchy(tokens);

console.log(JSON.stringify(hierarchy, null, 2));
