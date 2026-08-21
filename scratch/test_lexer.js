const { marked } = require('marked');

const md = `
# Heading 1
Some text
## Heading 2
More text
### Heading 3
Even more text
## Another Heading 2
Final text
`;

const tokens = marked.lexer(md);
console.log(tokens);

// Can we parse a subset?
const subset = tokens.slice(0, 2);
subset.links = tokens.links; // Required for parser
console.log(marked.parser(subset));
