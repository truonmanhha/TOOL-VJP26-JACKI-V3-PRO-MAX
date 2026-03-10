import fs from 'fs';
import path from 'path';

async function run() {
  console.log('Testing Discord upload...');
  const url = 'http://localhost:3000/api/discord-video';
  
  // Test small file
  const formData = new FormData();
  formData.append('payload_json', JSON.stringify({ content: 'Test export file' }));
  formData.append('file', new Blob(['dummy video content']), 'test.webm');
  
  try {
    console.log('Sending small dummy file...');
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Error:', err);
  }

  console.log('\nTesting large file...');
  // 8MB file
  const largeBuffer = Buffer.alloc(8 * 1024 * 1024, 'a');
  const formData2 = new FormData();
  formData2.append('payload_json', JSON.stringify({ content: 'Large test file' }));
  formData2.append('file', new Blob([largeBuffer]), 'large.webm');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData2
    });
    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
