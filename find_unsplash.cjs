const https = require('https');
https.get('https://unsplash.com/s/photos/historic-library', res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const matches = [...body.matchAll(/href="\/photos\/([^"]+)"/g)];
    const unique = [...new Set(matches.map(m => m[1]))].filter(id => id.length > 5 && !id.includes('/'));
    console.log('historic-library:', unique.slice(0, 5));
  });
});
https.get('https://unsplash.com/s/photos/cathedral-interior', res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const matches = [...body.matchAll(/href="\/photos\/([^"]+)"/g)];
    const unique = [...new Set(matches.map(m => m[1]))].filter(id => id.length > 5 && !id.includes('/'));
    console.log('cathedral-interior:', unique.slice(0, 5));
  });
});
https.get('https://unsplash.com/s/photos/castle-corridor', res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const matches = [...body.matchAll(/href="\/photos\/([^"]+)"/g)];
    const unique = [...new Set(matches.map(m => m[1]))].filter(id => id.length > 5 && !id.includes('/'));
    console.log('castle-corridor:', unique.slice(0, 5));
  });
});
https.get('https://unsplash.com/s/photos/candle-reading', res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const matches = [...body.matchAll(/href="\/photos\/([^"]+)"/g)];
    const unique = [...new Set(matches.map(m => m[1]))].filter(id => id.length > 5 && !id.includes('/'));
    console.log('candle-reading:', unique.slice(0, 5));
  });
});
https.get('https://unsplash.com/s/photos/rainy-university', res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const matches = [...body.matchAll(/href="\/photos\/([^"]+)"/g)];
    const unique = [...new Set(matches.map(m => m[1]))].filter(id => id.length > 5 && !id.includes('/'));
    console.log('rainy-university:', unique.slice(0, 5));
  });
});
