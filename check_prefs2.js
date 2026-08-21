async function check() {
  const res = await fetch("https://wwetwjfbexxbmjeprvku.supabase.co/rest/v1/user_preferences?limit=1", {
    headers: {
      apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZXR3amZiZXh4Ym1qZXBydmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzIxNTIsImV4cCI6MjEwMTYwODE1Mn0.BrS6YM4euBFgUxEJFPU88rVarf8poh1-GBGYv0d50Qk",
      Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZXR3amZiZXh4Ym1qZXBydmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzIxNTIsImV4cCI6MjEwMTYwODE1Mn0.BrS6YM4euBFgUxEJFPU88rVarf8poh1-GBGYv0d50Qk"
    }
  });
  console.log("Status:", res.status);
  console.log(await res.text());
}
check();
