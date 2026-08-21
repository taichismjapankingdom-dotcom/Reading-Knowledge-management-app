import { supabase } from './src/lib/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const { data, error } = await supabase.from('user_preferences').select('*');
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}
check();
