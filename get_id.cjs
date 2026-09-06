const https = require('https');
https.get('https://unsplash.com/s/photos/stone-corridor', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const parts = body.split('href="/photos/');
    parts.shift();
    const ids = parts.map(p => p.split('"')[0]).filter(id => id.length > 5 && !id.includes('/'));
    console.log(Array.from(new Set(ids)).slice(0, 5));
  });
});
