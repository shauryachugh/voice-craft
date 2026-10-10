async function runTests() {
  const assert = (condition, msg) => {
    if (!condition) {
      console.error(`FAIL: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
    console.log(`✓ ${msg}`);
  };

  console.log('--- Starting VoiceCraft Integration Tests ---');

  // 1. Health check
  const healthRes = await fetch('http://localhost:3000/api/health');
  assert(healthRes.ok, 'GET /api/health returned 200');

  // 2. HTML structure & content
  const htmlRes = await fetch('http://localhost:3000/');
  assert(htmlRes.ok, 'GET / returned 200');
  const html = await htmlRes.text();
  assert(html.includes('VoiceCraft'), 'HTML contains "VoiceCraft" branding');
  assert(html.includes('Turn your words into voice.'), 'HTML contains Hero title');
  assert(html.includes('Generate natural-sounding AI speech using ElevenLabs.'), 'HTML contains Hero subtitle');
  assert(html.includes('id="textInput"'), 'HTML contains text input element');
  assert(html.includes('id="charCount"'), 'HTML contains character counter');
  assert(html.includes('id="clearTextBtn"'), 'HTML contains clear text button');
  assert(html.includes('id="voiceSelector"'), 'HTML contains voice selector');
  assert(html.includes('id="toggleSettingsBtn"'), 'HTML contains voice settings toggle');
  assert(html.includes('id="generateBtn"'), 'HTML contains generate button');
  assert(html.includes('id="audioPlayerSection"'), 'HTML contains audio player section');
  assert(html.includes('id="historyList"'), 'HTML contains history list');
  assert(html.includes('id="apiModal"'), 'HTML contains API modal');

  // 3. Static Assets
  const assets = [
    'css/style.css',
    'js/api.js',
    'js/voices.js',
    'js/player.js',
    'js/history.js',
    'js/app.js'
  ];
  for (const asset of assets) {
    const res = await fetch(`http://localhost:3000/${asset}`);
    assert(res.ok, `GET /${asset} returned 200 OK (${res.headers.get('content-type')})`);
  }

  // 4. API Status
  const statusRes = await fetch('http://localhost:3000/api/status');
  assert(statusRes.ok, 'GET /api/status returned 200');
  const statusData = await statusRes.json();
  assert(statusData.configured !== undefined, 'API status response format is valid');

  // 5. Dynamic Voices from ElevenLabs
  const voicesRes = await fetch('http://localhost:3000/api/voices');
  assert(voicesRes.ok, 'GET /api/voices returned 200');
  const voicesData = await voicesRes.json();
  assert(Array.isArray(voicesData.voices) && voicesData.voices.length > 0, `Returned ${voicesData.voices.length} voices from ElevenLabs`);
  const firstVoice = voicesData.voices[0];
  assert(firstVoice.id && firstVoice.name, `Voice metadata has id and name (${firstVoice.name})`);

  // 6. Models endpoint
  const modelsRes = await fetch('http://localhost:3000/api/models');
  assert(modelsRes.ok, 'GET /api/models returned 200');
  const modelsData = await modelsRes.json();
  assert(modelsData.models.length >= 4, `Models list includes ${modelsData.models.length} options`);

  // 7. Validation: Empty text
  const emptyRes = await fetch('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '  ', voiceId: firstVoice.id })
  });
  assert(emptyRes.status === 400, 'Empty text correctly rejected with 400 status');

  // 8. Demo Audio Generation (Streaming binary MP3)
  const demoRes = await fetch('http://localhost:3000/api/demo-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voiceId: firstVoice.id })
  });
  assert(demoRes.ok, 'POST /api/demo-generate returned 200');
  assert(demoRes.headers.get('content-type') === 'audio/mpeg', 'Returned correct audio/mpeg MIME type');
  const audioBuffer = await demoRes.arrayBuffer();
  assert(audioBuffer.byteLength > 2000, `Audio binary stream verified (${audioBuffer.byteLength} bytes)`);

  console.log('\n=========================================');
  console.log('✓ ALL TEST ASSERTIONS PASSED SUCCESSFULLY!');
  console.log('=========================================');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
