/**
 * Progressive Cover Resolution Engine
 * Handles exact-ISBN lookups across multiple providers to ensure Booklog-level
 * Japanese coverage and strict compliance with source attribution and caching rules.
 */

const CACHE_TTL_DAYS = 30;

export const isCoverCacheValid = (timestamp) => {
  if (!timestamp) return false;
  const now = new Date().getTime();
  const cacheTime = new Date(timestamp).getTime();
  const daysOld = (now - cacheTime) / (1000 * 60 * 60 * 24);
  return daysOld < CACHE_TTL_DAYS;
};

const checkImageExists = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= 1 && img.height <= 1) {
        resolve(false);
      } else {
        resolve(true);
      }
    };
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

const isbn13To10 = (isbn13) => {
  if (isbn13.length !== 13 || !isbn13.startsWith('978')) return null;
  const s = isbn13.substring(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(s[i]) * (10 - i);
  }
  let checksum = (11 - (sum % 11)) % 11;
  if (checksum === 10) checksum = 'X';
  return s + checksum;
};

export const resolveCover = async (isbn) => {
  if (!isbn) return null;
  const cleanIsbn = isbn.replace(/-/g, '');
  const timestamp = new Date().toISOString();

  // 1. OpenBD
  try {
    const obdRes = await fetch(`https://api.openbd.jp/v1/get?isbn=${cleanIsbn}`);
    if (obdRes.ok) {
      const obdData = await obdRes.json();
      if (obdData && obdData[0] && obdData[0].summary && obdData[0].summary.cover) {
        let coverUrl = obdData[0].summary.cover.replace('http:', 'https:');
        if (await checkImageExists(coverUrl)) {
          return { url: coverUrl, source: 'OpenBD', timestamp };
        }
      }
    }
  } catch (err) {}

  // 2. Amazon Image CDN (The Ultimate Fallback)
  const isbn10 = isbn13To10(cleanIsbn) || (cleanIsbn.length === 10 ? cleanIsbn : null);
  if (isbn10) {
    // Note: This endpoint is widely used for Japanese physical book covers.
    const amzUrl = `https://images-fe.ssl-images-amazon.com/images/P/${isbn10}.09.LZZZZZZZ.jpg`;
    if (await checkImageExists(amzUrl)) {
      return { url: amzUrl, source: 'Amazon CDN', timestamp };
    }
  }

  // 3. Google Books
  try {
    const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
    if (gbRes.ok) {
      const gbData = await gbRes.json();
      if (gbData.items && gbData.items.length > 0) {
        const info = gbData.items[0].volumeInfo;
        if (info.imageLinks) {
          let coverUrl = (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail).replace('http:', 'https:');
          if (await checkImageExists(coverUrl)) {
            return { url: coverUrl, source: 'Google Books', timestamp };
          }
        }
      }
    }
  } catch (err) {}

  // 3. Open Library
  try {
    const olUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg?default=false`;
    const olRes = await fetch(olUrl, { method: 'HEAD' });
    if (olRes.ok && olRes.headers.get('content-type')?.includes('image')) {
       // Just to be absolutely sure, test it
       if (await checkImageExists(olUrl)) {
         return { url: olUrl, source: 'Open Library', timestamp };
       }
    }
  } catch (err) {}

  return null;
};
