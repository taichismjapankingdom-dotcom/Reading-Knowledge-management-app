const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = 'src/assets/dark-academia';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const images = {
  gothic_library: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Long_Room_Interior%2C_Trinity_College_Dublin%2C_Ireland_-_Diliff.jpg',
  cathedral_study: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Duke_Humfrey%27s_Library_Interior_6%2C_Bodleian_Library%2C_Oxford%2C_UK_-_Diliff.jpg',
  old_corridor: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Gloucester_Cathedral_Cloister_-_Oct_2008.jpg',
  candlelit_room: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Chetham%27s_Library_2015_1.jpg',
  rainy_night: 'https://upload.wikimedia.org/wikipedia/commons/8/87/University_College_Oxford_Front_Quad_Night.jpg'
};

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } }, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        download(response.headers.location, dest).then(resolve).catch(reject);
      } else {
        reject(new Error(`Failed to fetch: ${response.statusCode}`));
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
      await new Promise(r => setTimeout(r, 1000)); // Be nice to Wikimedia
    } catch (e) {
      console.error(`Error with ${key}:`, e);
    }
  }
})();
