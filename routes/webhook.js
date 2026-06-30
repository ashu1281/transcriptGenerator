const express = require('express');
const router = express.Router();
const config = require('../config');
const gcsService = require('../services/gcsService');
const transcoderService = require('../services/transcoderService');
const geminiService = require('../services/geminiService');

// Verify Pub/Sub request token helper
function verifyPubSubToken(req, res, next) {
  if (config.pubsubVerificationToken) {
    const token = req.query.token || req.headers['x-pubsub-token'];
    if (token !== config.pubsubVerificationToken) {
      console.warn('[Webhook] Unauthorized request blocked.');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
}

/**
 * POST /webhook/gcs
 * Endpoint for Pub/Sub push notifications on GCS events
 */
router.post('/gcs', verifyPubSubToken, async (req, res) => {
  try {
    const message = req.body?.message;
    if (!message || !message.data) {
      return res.status(400).json({ error: 'Invalid Pub/Sub message payload' });
    }

    // Decode Pub/Sub base64 payload
    const dataString = Buffer.from(message.data, 'base64').toString('utf8');
    const gcsEvent = JSON.parse(dataString);

    const { bucket, name, size, contentType } = gcsEvent;

    console.log(`[Webhook] Event received: bucket=${bucket}, path=${name}, size=${size}, type=${contentType}`);

    // Verify it is a video upload event matching directory requirements
    const isVideo = contentType?.startsWith('video/') || /\.(mp4|mov|avi|mkv|3gp|webm)$/i.test(name);
    
    if (!isVideo) {
      console.log(`[Webhook] Skipped non-video file: ${name}`);
      return res.status(200).json({ status: 'ignored', reason: 'Not a video file' });
    }

    // Immediately respond with 200 OK to acknowledge Pub/Sub receipt
    res.status(200).json({ status: 'queued', file: name });

    // Begin background processing pipeline
    processVideoBackground(name, size).catch(err => {
      console.error(`[Pipeline Error] Background processing failed for ${name}:`, err);
    });

  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process GCS video file asynchronously
 * @param {string} name - GCS path to video
 * @param {string|number} size - File size
 */
async function processVideoBackground(name, size) {
  console.log(`[Pipeline] Starting background job for: ${name} (${size} bytes)`);
  
  // Define GCS file paths
  const tempAudioPath = `${name}.temp.wav`;
  const baseName = name.replace(/\.[^/.]+$/, ''); // Removes extension (e.g. video.mp4 -> video)
  const txtTranscriptPath = `${baseName}.transcript.txt`;
  const jsonTranscriptPath = `${baseName}.transcript.json`;

  try {
    // 1. Update status to 'processing'
    await gcsService.updateStatus(name, 'processing');

    // 2. Transcode Video to Audio via streams
    console.log('[Pipeline] Transcoding video to audio...');
    const readStream = gcsService.createReadStream(name);
    const writeStream = gcsService.createWriteStream(tempAudioPath, 'audio/wav');
    
    await transcoderService.extractAudio(readStream, writeStream, name);

    // 3. Request Transcription from Gemini
    console.log('[Pipeline] Sending transcoded audio to Gemini...');
    const { text, json } = await geminiService.transcribeAudio(tempAudioPath);

    // 4. Save transcripts next to original video
    console.log(`[Pipeline] Uploading transcripts to GCS: ${txtTranscriptPath}`);
    await gcsService.uploadText(txtTranscriptPath, text, 'text/plain');
    await gcsService.uploadText(jsonTranscriptPath, JSON.stringify(json, null, 2), 'application/json');

    // 5. Update status to 'completed'
    await gcsService.updateStatus(name, 'completed');
    console.log(`[Pipeline] Completed processing for: ${name}`);

  } catch (error) {
    console.error(`[Pipeline] Failed to process video ${name}:`, error);
    
    // Update status to 'failed' with error message
    await gcsService.updateStatus(name, 'failed', error.message);
  } finally {
    // 6. Clean up temporary audio file from GCS
    try {
      console.log(`[Pipeline] Cleaning up temporary audio file: ${tempAudioPath}`);
      await gcsService.deleteFile(tempAudioPath);
    } catch (cleanupErr) {
      console.error(`[Pipeline] Failed to clean up temp audio ${tempAudioPath}:`, cleanupErr.message);
    }
  }
}

module.exports = router;
