const fs = require('fs');

let config = '';
try { config = fs.readFileSync('.env.local', 'utf8'); } catch(e){}

let supabaseUrl = '';
let supabaseKey = '';

config.split('\n').forEach(line => {
  if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.trim().startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

async function run() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/experts?select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const text = await res.text();
    fs.writeFileSync('output.json', text);
  } catch(e) {
    fs.writeFileSync('output.json', String(e));
  }
}
run();
