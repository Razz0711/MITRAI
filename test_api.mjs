const fs = require('fs');
const https = require('https');

let config = '';
try { config = fs.readFileSync('.env.local', 'utf8'); } catch(e){}

let supabaseUrl = '';
let supabaseKey = '';

config.split('\n').forEach(line => {
  if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.trim().startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

if (!supabaseUrl) { fs.writeFileSync('test.log', 'NO URL FOUND'); process.exit(1); }

const parsedUrl = new URL(`${supabaseUrl}/rest/v1/experts?select=id,name,is_active`);

const options = {
  hostname: parsedUrl.hostname,
  path: parsedUrl.pathname + parsedUrl.search,
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { fs.writeFileSync('test.log', data); });
});

req.on('error', (e) => {
  fs.writeFileSync('test.log', 'REQ ERROR: ' + e.message);
});

req.end();
