const url = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';

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
            title: 'Test REST API',
            student_name: 'Test REST',
            time: '10:00',
            event_id: 'test-event-123'
        })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
}
test();
