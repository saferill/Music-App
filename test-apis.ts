const API_BASE = 'http://localhost:3000/api';

async function testSponsorBlock(videoId: string) {
  console.log(`Testing SponsorBlock for ${videoId}...`);
  try {
    const res = await fetch(`${API_BASE}/sponsorblock?id=${videoId}`);
    const data = await res.json();
    console.log('SponsorBlock Result:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

async function testStream(videoId: string) {
  console.log(`Testing Stream for ${videoId}...`);
  try {
    const res = await fetch(`${API_BASE}/stream?id=${videoId}`);
    const data = await res.json();
    console.log('Stream Result (InnerTube):', data.stream?.api === 'innertube' ? 'SUCCESS' : 'FALLBACK TO PIPED');
    if (data.stream?.url) {
        console.log('URL Length:', data.stream.url.length);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

async function testNext(videoId: string) {
  console.log(`Testing Next (Radio) for ${videoId}...`);
  try {
    const res = await fetch(`${API_BASE}/next?id=${videoId}`);
    const data = await res.json();
    console.log('Next Tracks Count:', data.tracks?.length || 0);
    if (data.tracks?.[0]) {
        console.log('First suggestion:', data.tracks[0].name);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

// Dummy Test
const testId = 'jfKfPfyJRdk'; // Lofi Girl or similar
// We can't actually run this against the dev server easily without starting it, 
// but I'll provide it as a scratch script for the user.
console.log('Script ready. Run with "npx tsx test-apis.ts" while dev server is running.');
