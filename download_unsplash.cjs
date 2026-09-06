const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = 'src/assets/dark-academia';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const images = {
  gothic_library: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=2000&auto=format&fit=crop',
  cathedral_study: 'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?q=80&w=2000&auto=format&fit=crop',
  old_corridor: 'https://images.unsplash.com/photo-1509315410940-202d57271926?q=80&w=2000&auto=format&fit=crop',
  candlelit_room: 'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?q=80&w=2000&auto=format&fit=crop',
  rainy_night: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=2000&auto=format&fit=crop'
};

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        download(res.headers.location, dest).then(resolve).catch(reject);
      } else if (res.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      } else {
        reject(new Error('Status: ' + res.statusCode));
      }
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
};

(async () => {
  for (const [key, url] of Object.entries(images)) {
    console.log(`Downloading ${key}...`);
    try {
      await download(url, path.join(dir, key + '.jpg'));
      console.log(`${key} downloaded.`);
    } catch (e) {
      console.error(`Error with ${key}:`, e);
    }
  }
})();
