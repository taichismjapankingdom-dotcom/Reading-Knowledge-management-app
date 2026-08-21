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
const html = marked.parser(tokens);

const lines = html.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('**')) {
    console.log('FAILED TO PARSE ** ON LINE:', i + 1);
    console.log(lines[i]);
  }
}
