import { searchNdl, fetchNdlByIsbn } from './ndlApi';
import localforage from 'localforage';

/**
 * Multi-source metadata engine.
 * Queries Google Books, Open Library, and National Diet Library (NDL).
 */

const metaCache = localforage.createInstance({
  name: 'ReadingKnowledgeApp',
  storeName: 'metaCache'
});

const normalizeString = (str) => {
  if (!str) return '';
  // Convert full-width to half-width, lowercase, strip punctuation and spaces
  return str.normalize('NFKC')
    .replace(/[『』「」（）()・,.;:\s]/g, '')
    .toLowerCase();
};

export const cleanAuthorString = (raw) => {
  if (!raw) return "Unknown Author";
  let cleaned = raw.replace(/\[?(著|編|訳|監修|原作|作画|イラスト|写真)\]?/g, '').trim();
  let parts = cleaned.split(/,\s*/).filter(Boolean);
  
  const bestParts = [];
  for (let i = 0; i < parts.length; i++) {
     let isSubPart = false;
     for (let j = 0; j < parts.length; j++) {
       if (i !== j && parts[j].replace(/\s/g,'').includes(parts[i].replace(/\s/g,''))) {
         isSubPart = true;
         break;
       }
     }
     if (!isSubPart) bestParts.push(parts[i]);
  }
  return Array.from(new Set(bestParts)).join(', ');
};

const deduplicateAndMerge = (results) => {
  const merged = [];
  
  for (const book of results) {
    // Find an existing match by exact ISBN or highly similar normalized title + author
    const matchIndex = merged.findIndex(existing => {
      if (existing.isbn && book.isbn && existing.isbn === book.isbn) return true;
      const t1 = normalizeString(existing.title);
      const t2 = normalizeString(book.title);
      const a1 = normalizeString(existing.author);
      const a2 = normalizeString(book.author);
      // If titles are exactly the same and authors are exactly the same (after stripping spaces/punctuation)
      return t1 === t2 && a1 === a2;
    });

    if (matchIndex >= 0) {
      // Merge best fields
      const existing = merged[matchIndex];
      // Prefer high-res cover
      if (!existing.coverUrl && book.coverUrl) {
        existing.coverUrl = book.coverUrl;
        existing.coverSource = book.coverSource;
        existing.coverTimestamp = book.coverTimestamp;
      }
      if (!existing.publisher && book.publisher) existing.publisher = book.publisher;
      if (!existing.publicationYear && book.publicationYear) existing.publicationYear = book.publicationYear;
      if (!existing.isbn && book.isbn) existing.isbn = book.isbn;
      if (!existing.description && book.description) existing.description = book.description;
      if (existing.pages === 0 && book.pages > 0) existing.pages = book.pages;
    } else {
      merged.push(book);
    }
  }
  return merged;
};

// Ranking logic to suppress commentary and surface true classics
const rankCandidates = (query, candidates) => {
  const normQuery = normalizeString(query);
  
  return candidates.map(candidate => {
    let score = 0;
    const normTitle = normalizeString(candidate.title);
    const normAuthor = normalizeString(candidate.author);
    
    // Exact title match gets massive priority
    if (normTitle === normQuery) {
      score += 1000;
    } else if (normTitle.startsWith(normQuery)) {
      score += 500;
      // If it starts with the query, check if it's just the query + edition info vs commentary
      if (normTitle.match(/を読む|論$|研究$|解説$|入門$|完全ガイド$|の世界$|を考える$/)) {
        score -= 400; // Penalize commentary
      } else {
        score += 100; // Probably a subtitle or edition
      }
    } else if (normTitle.includes(normQuery)) {
      score += 100;
      if (normTitle.match(/を読む|論$|研究$|解説$|入門$|完全ガイド$|の世界$|を考える$/)) {
        score -= 200; // Penalize commentary heavily
      }
    }
    
    // If the query includes the author name, boost it heavily
    // Alternatively, if the candidate author matches parts of the query
    if (normQuery.includes(normAuthor) && normAuthor.length > 2) {
      score += 300;
    }
    
    // Small boost for having a cover
    if (candidate.coverUrl) {
      score += 50;
    }
    
    // Penalize weirdly long titles (often omnibuses or weird compilations) unless the query was also long
    if (normTitle.length > normQuery.length * 3) {
      score -= 50;
    }

    return { ...candidate, _score: score };
  }).sort((a, b) => b._score - a._score);
};

export const searchBooks = async (query) => {
  try {
    const cacheKey = `search_${normalizeString(query)}`;
    const cached = await metaCache.getItem(cacheKey);
    if (cached) return cached;

    // Parallel search across all providers with increased maxResults
    const [googleRes, ndlRes] = await Promise.allSettled([
      fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40`).then(res => res.json()),
      searchNdl(query)
    ]);

    let results = [];

    if (googleRes.status === 'fulfilled' && googleRes.value.items) {
      results = results.concat(googleRes.value.items.map(normalizeGoogleBooksData));
    }

    if (ndlRes.status === 'fulfilled' && ndlRes.value.length > 0) {
      results = results.concat(ndlRes.value);
    }

    results = results.map(r => ({ ...r, author: cleanAuthorString(r.author) }));
    
    let finalResults = deduplicateAndMerge(results);
    
    // Rank candidates aggressively
    finalResults = rankCandidates(query, finalResults);
    
    // Clean up internal _score
    finalResults.forEach(r => delete r._score);

    if (finalResults.length > 0) {
      await metaCache.setItem(cacheKey, finalResults);
    }

    return finalResults;
  } catch (err) {
    console.error("Error in multi-source search:", err);
    throw new Error("Search failed. Please check your network connection.");
  }
};

export const fetchByISBN = async (rawIsbn) => {
  const isbn = rawIsbn.replace(/-/g, '');
  
  try {
    const cacheKey = `isbn_${isbn}`;
    const cached = await metaCache.getItem(cacheKey);
    if (cached) return cached;

    // Parallel fetch
    const [googleRes, openLibRes, ndlRes] = await Promise.allSettled([
      fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`).then(res => res.json()),
      fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`).then(res => res.json()),
      fetchNdlByIsbn(isbn)
    ]);

    let results = [];

    if (googleRes.status === 'fulfilled' && googleRes.value.items && googleRes.value.items.length > 0) {
      results.push(normalizeGoogleBooksData(googleRes.value.items[0]));
    }

    if (openLibRes.status === 'fulfilled' && openLibRes.value[`ISBN:${isbn}`]) {
      const olBook = openLibRes.value[`ISBN:${isbn}`];
      const coverUrl = olBook.cover ? olBook.cover.large : '';
      results.push({
        id: `ol-${isbn}`,
        title: olBook.title,
        author: olBook.authors ? olBook.authors.map(a => a.name).join(', ') : 'Unknown Author',
        publicationYear: olBook.publish_date || '',
        publisher: olBook.publishers ? olBook.publishers[0].name : '',
        isbn: isbn,
        pages: olBook.number_of_pages || 0,
        coverUrl: coverUrl, 
        coverSource: coverUrl ? "Open Library" : null,
        coverTimestamp: coverUrl ? new Date().toISOString() : null,
        type: 'learning',
        source: 'OpenLibrary'
      });
    }

    if (ndlRes.status === 'fulfilled' && ndlRes.value.length > 0) {
      results.push(ndlRes.value[0]);
    }

    if (results.length === 0) {
      throw new Error("No metadata found for this ISBN across any provider.");
    }

    results = results.map(r => ({ ...r, author: cleanAuthorString(r.author) }));
    const finalBook = deduplicateAndMerge(results)[0];
    
    await metaCache.setItem(cacheKey, finalBook);
    return finalBook;
  } catch (err) {
    console.error("Error in multi-source ISBN fetch:", err);
    throw err;
  }
};

function normalizeGoogleBooksData(item) {
  const info = item.volumeInfo;
  
  let coverUrl = "";
  if (info.imageLinks) {
    coverUrl = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || "";
    coverUrl = coverUrl.replace('http:', 'https:');
  }

  return {
    id: `gb-${item.id}`,
    title: info.title,
    subtitle: info.subtitle || "",
    author: info.authors ? info.authors.join(", ") : "Unknown Author",
    publicationYear: info.publishedDate ? info.publishedDate.substring(0, 4) : "",
    publisher: info.publisher || "",
    isbn: info.industryIdentifiers ? info.industryIdentifiers[0].identifier : "",
    pages: info.pageCount || 0,
    description: info.description || "",
    genres: info.categories || [],
    coverUrl: coverUrl,
    coverSource: coverUrl ? "Google Books" : null,
    coverTimestamp: coverUrl ? new Date().toISOString() : null,
    type: "learning",
    source: "Google"
  };
}
