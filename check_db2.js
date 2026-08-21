const SUPABASE_URL = "https://wwetwjfbexxbmjeprvku.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZXR3amZiZXh4Ym1qZXBydmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzIxNTIsImV4cCI6MjEwMTYwODE1Mn0.BrS6YM4euBFgUxEJFPU88rVarf8poh1-GBGYv0d50Qk";

async function check() {
  const notesRes = await fetch(`${SUPABASE_URL}/rest/v1/notes`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  });
  const notes = await notesRes.json();
  console.log("Notes count:", notes.length);
  // Log the first note's favorite quotes if any
  if (notes.length > 0) {
    const noteContent = notes[0].content || {};
    console.log("Note 0 quotes:", JSON.stringify(noteContent.favoriteQuotes));
  }
  
  const prefsRes = await fetch(`${SUPABASE_URL}/rest/v1/user_preferences`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  });
  const prefs = await prefsRes.json();
  console.log("Prefs:", JSON.stringify(prefs, null, 2));
}
check();
