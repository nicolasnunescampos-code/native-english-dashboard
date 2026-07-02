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
    console.log("Posting to classes...");
    const res = await fetch(url + '/rest/v1/classes', {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': 'Bearer ' + key,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            date: '2026-06-25',
            title: 'Test PK',
            student_name: 'Test PK',
            time: '10:00'
            // notice NO event_id
        })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
}
test();
