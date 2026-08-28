/**
 * National Diet Library (NDL) API Integration
 * Complies with NDL OpenSearch API specifications.
 * Returns XML which is parsed natively in the browser.
 */

const NDL_API_URL = "https://ndlsearch.ndl.go.jp/api/opensearch";

export const searchNdl = async (query) => {
  try {
    const res = await fetch(`${NDL_API_URL}?title=${encodeURIComponent(query)}&cnt=40`);
    if (!res.ok) throw new Error("NDL network response was not ok");
    const text = await res.text();
    return parseNdlXml(text);
  } catch (err) {
    console.warn("NDL API Search Error:", err);
    return [];
  }
};

export const fetchNdlByIsbn = async (isbn) => {
  try {
    const res = await fetch(`${NDL_API_URL}?isbn=${isbn}`);
    if (!res.ok) throw new Error("NDL network response was not ok");
    const text = await res.text();
    return parseNdlXml(text);
  } catch (err) {
    console.warn("NDL API ISBN Error:", err);
    return [];
  }
};

function parseNdlXml(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "text/xml");
  const items = xml.querySelectorAll("item");
  
  return Array.from(items).map(item => {
    const title = item.querySelector("title")?.textContent || "Unknown Title";
    const author = item.querySelector("author")?.textContent || 
                   item.getElementsByTagNameNS("*", "creator")[0]?.textContent || 
                   "Unknown Author";
                   
    const publisher = item.getElementsByTagNameNS("*", "publisher")[0]?.textContent || "";
    
    // NDL date format can be weird, try to extract year
    let pubDate = item.querySelector("pubDate")?.textContent || "";
    if (pubDate) {
      const match = pubDate.match(/\d{4}/);
      if (match) pubDate = match[0];
    }

    // Extract ISBN
    const identifiers = item.getElementsByTagNameNS("*", "identifier");
    let isbn = "";
    for (let i = 0; i < identifiers.length; i++) {
      const id = identifiers[i];
      if (id.getAttribute("xsi:type") === "dcndl:ISBN") {
        isbn = id.textContent;
        break;
      }
    }
    
    // NDL provides a standardized thumbnail service based on ISBN
    const cleanIsbn = isbn.replace(/-/g, '');
    const coverUrl = cleanIsbn ? `https://ndlsearch.ndl.go.jp/thumbnail/${cleanIsbn}.jpg` : "";

    return {
      id: `ndl-${Math.random().toString(36).substr(2, 9)}`,
      title,
      author,
      publicationYear: pubDate,
      publisher,
      isbn: cleanIsbn,
      pages: 0,
      description: "",
      genres: [],
      coverUrl,
      type: "learning",
      source: "NDL"
    };
  });
}
