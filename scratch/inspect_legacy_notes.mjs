import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wwetwjfbexxbmjeprvku.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZXR3amZiZXh4Ym1qZXBydmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzIxNTIsImV4cCI6MjEwMTYwODE1Mn0.BrS6YM4euBFgUxEJFPU88rVarf8poh1-GBGYv0d50Qk'
);

async function inspectNotes() {
  const { data, error } = await supabase.from('notes').select('*');
  if (error) {
    console.error('Error fetching notes:', error);
    return;
  }
  
  data.forEach(note => {
    console.log(`\n--- Note for Book ID: ${note.book_id} ---`);
    const content = typeof note.content === 'string' ? JSON.parse(note.content) : note.content;
    console.log(JSON.stringify(content.markdown));
  });
}

inspectNotes();
