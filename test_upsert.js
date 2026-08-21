import { supabase } from './src/lib/supabase.js';
import dotenv from 'dotenv';

// We must manually load dotenv for node
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
});

async function testUpsert() {
  // Use a hardcoded dummy UUID for testing or the real user ID if we knew it.
  // We can't insert a random UUID because of the foreign key constraint on auth.users!
  // So we just test if the query is syntactically valid by inserting and seeing the error.
  const { data, error } = await supabase.from('user_preferences').upsert({
    user_id: "00000000-0000-0000-0000-000000000000",
    preferences: { test: true },
    updated_at: new Date().toISOString()
  });
  console.log("Upsert result:", error ? error.message : "Success");
}
testUpsert();
