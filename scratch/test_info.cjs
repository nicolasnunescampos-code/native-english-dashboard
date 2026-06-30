const fs = require('fs');

let envFile = '';
try { envFile = fs.readFileSync('.env', 'utf-8'); } catch(e) {}

let url = '';
let key = '';
for (const line of envFile.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

async function test() {
    console.log("Fetching primary key constraint columns...");
    // We can use the PostgREST endpoint for Postgres meta if available, or just standard tables if they are exposed.
    // Wait, information_schema is NOT exposed by PostgREST by default!
    // But we can check if they have any RPC functions.
    const res = await fetch(url + '/rest/v1/?apikey=' + key);
    const json = await res.json();
    console.log("Exposed endpoints:", Object.keys(json.paths || {}));
}
test();
