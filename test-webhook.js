const axios = require('axios');

// Simulated GCS finalize event payload
const mockGcsEvent = {
  bucket: 'your-gcs-bucket-name',
  name: 'atm-defense/smith-attorney/tiktok/video1.mp4',
  size: 3456789,
  contentType: 'video/mp4',
  timeCreated: new Date().toISOString()
};

// Encode event to base64 format representing Pub/Sub structure
const messageData = Buffer.from(JSON.stringify(mockGcsEvent)).toString('base64');

const mockPubSubPayload = {
  message: {
    data: messageData,
    messageId: 'mock-msg-id-123456',
    publishTime: new Date().toISOString()
  },
  subscription: 'projects/mock-project/subscriptions/mock-sub'
};

const port = process.argv[2] || 5001;
const url = `http://localhost:${port}/webhook/gcs`;

console.log(`[Test] Sending mock GCS event to webhook at ${url}...`);

axios.post(url, mockPubSubPayload)
  .then(response => {
    console.log('[Test] Response status:', response.status);
    console.log('[Test] Response body:', response.data);
    console.log('[Test] Simulated video pipeline started successfully!');
  })
  .catch(error => {
    console.error('[Test] Error sending event:', error.response ? error.response.data : error.message);
  });
