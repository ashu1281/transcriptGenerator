//  run below commmand to run script
// node trigger-test.js

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.development
dotenv.config({ path: path.resolve(__dirname, '.env.development') });

const port = process.env.PORT || 5001;
const bucket = process.env.GCS_BUCKET_NAME || 'atm-defense';
const token = process.env.PUBSUB_VERIFICATION_TOKEN || '';
const videoPath = 'ashish/youtube/video/videoplayback.mp4';

// 1. Build the simulated GCS event payload
const mockGcsEvent = {
  bucket,
  name: videoPath,
  size: 1048576, // 1MB simulated size
  contentType: 'video/mp4',
  timeCreated: new Date().toISOString()
};

// 2. Base64 encode the GCS event to represent the Pub/Sub wrapper structure
const messageData = Buffer.from(JSON.stringify(mockGcsEvent)).toString('base64');

const mockPubSubPayload = {
  message: {
    data: messageData,
    messageId: 'mock-msg-id-123456',
    publishTime: new Date().toISOString()
  }
};

// 3. Define the target local webhook endpoint
const url = `http://localhost:${port}/webhook/gcs?token=${token}`;

console.log(`[Test Trigger] Sending mock GCS event for "gs://${bucket}/${videoPath}"`);
console.log(`[Test Trigger] Webhook Target URL: ${url}`);

// 4. Perform the HTTP POST request using native Node.js fetch
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(mockPubSubPayload)
})
  .then(async response => {
    const data = await response.json();
    console.log('[Test Trigger] Response status:', response.status);
    console.log('[Test Trigger] Response body:', data);
    if (response.status === 200) {
      console.log('[Test Trigger] Simulated video pipeline started successfully!');
    }
  })
  .catch(error => {
    console.error('[Test Trigger] Connection error:', error.message);
  });
