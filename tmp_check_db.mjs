import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing supabase env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data, error } = await supabase.from('post_comments').select('*').limit(1);
  if (error) {
    console.error("Error connecting to post_comments:", error.message);
    
    // Attempt to create it if it says relation doesn't exist
    if (error.message.includes("relation") || error.message.includes("does not exist")) {
      console.log("Attempting to run migration...");
      // We don't have direct SQL exec, but let's see what the error is first.
    }
  } else {
    console.log("post_comments exists:", data);
  }
}
main();
