import assert from 'node:assert/strict';
import voicesHandler from '../netlify/functions/voices.mjs';
import generateHandler from '../netlify/functions/generate.mjs';

async function runTests() {
  console.log('Running serverless functions validation tests...');

  // Test 1: voices function without ELEVENLABS_API_KEY returns 503
  delete process.env.ELEVENLABS_API_KEY;
  const mockVoicesReq = new Request('http://localhost/api/voices', { method: 'GET' });
  const voicesRes = await voicesHandler(mockVoicesReq);
  assert.equal(voicesRes.status, 503, 'Should return 503 when API key is missing');
  const voicesData = await voicesRes.json();
  assert.equal(voicesData.configured, false, 'configured flag must be false');
  assert.ok(voicesData.message.includes('ELEVENLABS_API_KEY'), 'Should advise setting ELEVENLABS_API_KEY');
  console.log('✔ Test 1: Voice listing returns clean 503 configuration error when key is unset.');

  // Test 2: voices function rejects POST with 405
  const mockVoicesPost = new Request('http://localhost/api/voices', { method: 'POST' });
  const voicesPostRes = await voicesHandler(mockVoicesPost);
  assert.equal(voicesPostRes.status, 405, 'Should return 405 for POST to /api/voices');
  console.log('✔ Test 2: Voice listing returns 405 Method Not Allowed on invalid HTTP method.');

  // Test 3: generate function without ELEVENLABS_API_KEY returns 503
  const mockGenReq = new Request('http://localhost/api/generate', {
    method: 'POST',
    body: JSON.stringify({ text: 'Hello', voiceId: '21m00Tcm4TlvDq8ikWAM' }),
  });
  const genRes = await generateHandler(mockGenReq);
  assert.equal(genRes.status, 503, 'Should return 503 when API key is missing');
  const genData = await genRes.json();
  assert.equal(genData.configured, false);
  console.log('✔ Test 3: Speech generation returns clean 503 configuration error when key is unset.');

  // Test 4: generate function rejects non-POST with 405
  const mockGenGet = new Request('http://localhost/api/generate', { method: 'GET' });
  const genGetRes = await generateHandler(mockGenGet);
  assert.equal(genGetRes.status, 405, 'Should return 405 on GET to /api/generate');
  console.log('✔ Test 4: Speech generation returns 405 Method Not Allowed on non-POST method.');

  // Test 5: generate function validates empty text when simulated with a dummy key
  process.env.ELEVENLABS_API_KEY = 'test_key_dummy_123';
  const mockEmptyText = new Request('http://localhost/api/generate', {
    method: 'POST',
    body: JSON.stringify({ text: '   ', voiceId: '21m00Tcm4TlvDq8ikWAM' }),
  });
  const emptyTextRes = await generateHandler(mockEmptyText);
  assert.equal(emptyTextRes.status, 400, 'Should return 400 when text is empty');
  const emptyTextData = await emptyTextRes.json();
  assert.ok(emptyTextData.message.includes('empty'), 'Message should indicate text is empty');
  console.log('✔ Test 5: Speech generation validates empty text.');

  // Test 6: generate function validates missing voiceId
  const mockEmptyVoice = new Request('http://localhost/api/generate', {
    method: 'POST',
    body: JSON.stringify({ text: 'Hello world', voiceId: '' }),
  });
  const emptyVoiceRes = await generateHandler(mockEmptyVoice);
  assert.equal(emptyVoiceRes.status, 400, 'Should return 400 when voiceId is empty');
  console.log('✔ Test 6: Speech generation validates empty voice ID.');

  // Clean up
  delete process.env.ELEVENLABS_API_KEY;

  console.log('\nAll 6 serverless backend tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
