import { supabase } from './src/lib/supabase.js';
import dotenv from 'dotenv';
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim();
});

async function check() {
  const { data: notes, error: notesError } = await supabase.from('notes').select('*');
  console.log("Notes:", JSON.stringify(notes, null, 2));
  
  const { data: prefs, error: prefsError } = await supabase.from('user_preferences').select('*');
  console.log("Prefs:", JSON.stringify(prefs, null, 2));
}
check();
