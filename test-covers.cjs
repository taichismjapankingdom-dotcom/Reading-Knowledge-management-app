const https = require('https');

function checkImage(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return checkImage(res.headers.location).then(resolve);
      }
      
      let isImage = res.headers['content-type'] && res.headers['content-type'].startsWith('image');
      
      // Amazon returns a 1x1 GIF if missing: length 43 bytes
      if (res.headers['content-length'] && parseInt(res.headers['content-length']) < 100) {
        isImage = false;
      }
      
      resolve({ url, status: res.statusCode, isImage });
    }).on('error', (e) => {
      resolve({ url, error: e.message });
    });
  });
}

function isbn13To10(isbn13) {
  const s = isbn13.substring(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(s[i]) * (10 - i);
  }
  let checksum = (11 - (sum % 11)) % 11;
  if (checksum === 10) checksum = 'X';
  return s + checksum;
}

async function testIsbn(isbn13) {
  console.log(`\nTesting ISBN: ${isbn13}`);
  const isbn10 = isbn13To10(isbn13);
  
  const urls = [
    `https://api.openbd.jp/v1/get?isbn=${isbn13}`,
    `https://ndlsearch.ndl.go.jp/thumbnail/${isbn13}.jpg`,
    `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.09.LZZZZZZZ.jpg`,
    `https://images-fe.ssl-images-amazon.com/images/P/${isbn10}.09.LZZZZZZZ.jpg`,
    `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg?default=false`
  ];
  
  for (const url of urls) {
    if (url.includes('api.openbd.jp')) {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (j[0] && j[0].summary && j[0].summary.cover) {
              console.log(`OpenBD: Found -> ${j[0].summary.cover}`);
            } else {
              console.log(`OpenBD: Not Found`);
            }
          } catch(e) {
            console.log(`OpenBD: Error`);
          }
        });
      });
      continue;
    }
    
    const result = await checkImage(url);
    console.log(`URL: ${url}`);
    console.log(`  -> Status: ${result.status}, isImage: ${result.isImage}`);
  }
}

// 汝、星のごとく (Nanji, Hoshi no Gotoku) ISBN: 9784065281499
testIsbn('9784065281499');

// Another test book
testIsbn('9784478108499'); // generic business book
