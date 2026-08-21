const SUPABASE_URL = "https://wwetwjfbexxbmjeprvku.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZXR3amZiZXh4Ym1qZXBydmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzIxNTIsImV4cCI6MjEwMTYwODE1Mn0.BrS6YM4euBFgUxEJFPU88rVarf8poh1-GBGYv0d50Qk";

async function check() {
  const booksRes = await fetch(`${SUPABASE_URL}/rest/v1/books`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  });
  const books = await booksRes.json();
  console.log("Books count:", books.length);
  if (books.length > 0) {
    console.log("Book 0 ID:", books[0].id);
  }
}
check();
