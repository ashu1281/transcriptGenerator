const path = require('path');
const dotenv = require('dotenv');

// Load environment variables (.env.development in dev, falling back to .env)
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config(); // fallback to standard .env if needed

const config = {
  port: process.env.PORT || 5001,
  gcpProjectId: process.env.GCP_PROJECT_ID,
  gcsBucketName: process.env.GCS_BUCKET_NAME,
  location: process.env.LOCATION || 'us-central1',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
  pubsubVerificationToken: process.env.PUBSUB_VERIFICATION_TOKEN || '',
  nodeEnv: process.env.NODE_ENV || 'development'
};

// Validate required environment variables
if (!config.gcpProjectId) {
  console.warn('[Warning] GCP_PROJECT_ID environment variable is missing.');
}
if (!config.gcsBucketName) {
  console.warn('[Warning] GCS_BUCKET_NAME environment variable is missing.');
}

module.exports = config;
