const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = 'src/assets/dark-academia';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const images = {
  gothic_library: 'https://upload.wikimedia.org/wikipedia/commons/4/43/The_Long_Room%2C_Trinity_College_Dublin_-_April_2022.jpg',
  cathedral_study: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Gloucester_Cathedral_Cloister_-_Oct_2008.jpg',
  old_corridor: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Christ_Church_cloisters.jpg',
  candlelit_room: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Chethams_Library_interior.jpg',
  rainy_night: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Radcliffe_Camera%2C_Oxford_at_night.jpg'
};

const promises = Object.entries(images).map(([key, url]) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(dir, key + '.jpg'));
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${key}: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', err => { fs.unlink(file.path, () => {}); reject(err); });
  });
});

Promise.all(promises)
  .then(() => console.log('Downloaded all Dark Academia images successfully!'))
  .catch(err => console.error('Error downloading:', err));
