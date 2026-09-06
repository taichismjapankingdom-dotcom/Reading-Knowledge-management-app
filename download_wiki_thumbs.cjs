const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = 'src/assets/dark-academia';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const images = {
  gothic_library: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Long_Room_Interior%2C_Trinity_College_Dublin%2C_Ireland_-_Diliff.jpg/1920px-Long_Room_Interior%2C_Trinity_College_Dublin%2C_Ireland_-_Diliff.jpg',
  cathedral_study: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Duke_Humfrey%27s_Library_Interior_6%2C_Bodleian_Library%2C_Oxford%2C_UK_-_Diliff.jpg/1920px-Duke_Humfrey%27s_Library_Interior_6%2C_Bodleian_Library%2C_Oxford%2C_UK_-_Diliff.jpg',
  old_corridor: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Gloucester_Cathedral_Cloister_-_Oct_2008.jpg/1920px-Gloucester_Cathedral_Cloister_-_Oct_2008.jpg',
  candlelit_room: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Chetham%27s_Library_2015_1.jpg/1920px-Chetham%27s_Library_2015_1.jpg',
  rainy_night: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/University_College_Oxford_Front_Quad_Night.jpg/1920px-University_College_Oxford_Front_Quad_Night.jpg'
};

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ReadingKnowledgeAppBot/1.0 (test@example.com)' } }, (res) => {
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
