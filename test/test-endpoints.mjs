import assert from 'node:assert/strict';

async function testNetlifyDev() {
  console.log('Testing live Netlify Dev server at http://localhost:8888...');

  // 1. Test Static Frontend
  const htmlRes = await fetch('http://localhost:8888/');
  assert.equal(htmlRes.status, 200, 'Frontend index.html should return 200 OK');
  const htmlText = await htmlRes.text();
  assert.ok(htmlText.includes('VoiceCraft'), 'HTML must include VoiceCraft branding');
  assert.ok(htmlText.includes('Powered by ElevenLabs'), 'HTML must include ElevenLabs attribution');
  console.log('✔ Static frontend served correctly (200 OK with VoiceCraft branding).');

  // 2. Test /api/voices route (missing key returns 503 gracefully)
  const voicesRes = await fetch('http://localhost:8888/api/voices');
  assert.equal(voicesRes.status, 503, 'Should return 503 Service Unavailable when key is unset');
  const voicesData = await voicesRes.json();
  assert.equal(voicesData.configured, false, 'configured field must be false');
  console.log('✔ GET /api/voices redirected to function and returned 503 missing-key error as expected.');

  // 3. Test /api/generate route (missing key returns 503 gracefully)
  const genRes = await fetch('http://localhost:8888/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Hello', voiceId: '21m00Tcm4TlvDq8ikWAM' }),
  });
  assert.equal(genRes.status, 503, 'Should return 503 when key is unset');
  const genData = await genRes.json();
  assert.equal(genData.configured, false);
  console.log('✔ POST /api/generate redirected to function and returned 503 missing-key error as expected.');

  // 4. Test Method Not Allowed on /api/generate
  const genGetRes = await fetch('http://localhost:8888/api/generate', { method: 'GET' });
  assert.equal(genGetRes.status, 405, 'GET on /api/generate should return 405 Method Not Allowed');
  console.log('✔ GET /api/generate correctly returned 405 Method Not Allowed.');

  // 5. Test Method Not Allowed on /api/voices
  const voicesPostRes = await fetch('http://localhost:8888/api/voices', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  assert.equal(voicesPostRes.status, 405, 'POST on /api/voices should return 405 Method Not Allowed');
  console.log('✔ POST /api/voices correctly returned 405 Method Not Allowed.');

  console.log('\nAll Netlify live endpoint checks passed with 100% success!');
}

testNetlifyDev().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
