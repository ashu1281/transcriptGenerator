const express = require('express');
const config = require('./config');
const webhookRoutes = require('./routes/webhook');

const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint (useful for Cloud Run / Kubernetes probes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount webhook routes
app.use('/webhook', webhookRoutes);

// Catch-all route handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global unhandled error handler
app.use((err, req, res, next) => {
  console.error('[Global Error] Unhandled exception:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start the server
app.listen(config.port, () => {
  console.log(`[Server] transcriptGenerator listening on port ${config.port}`);
  console.log(`[Server] GCP Project: ${config.gcpProjectId}`);
  console.log(`[Server] GCS Bucket: ${config.gcsBucketName}`);
  console.log(`[Server] Gemini Model: ${config.geminiModel}`);
});
