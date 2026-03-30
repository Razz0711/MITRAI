import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let config = '';
try {
  config = fs.readFileSync('.env.local', 'utf8');
} catch (e) {
  config = fs.readFileSync('.env', 'utf8');
}

let supabaseUrl = '';
let supabaseKey = '';

config.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

if (!supabaseUrl) console.log('NO URL');

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('experts')
    .select('id, name, title, gender, experience_years, qualifications, languages, expertise, specializations, about, avatar_url, rating, review_count, price_per_session, session_duration_mins, is_featured, sort_order')
    .eq('is_active', true)
    ;

  if (error) {
    console.log('Supabase Error:', error.message);
  } else {
    console.log('Experts fetched length:', data?.length);
  }
}

check();
