const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

class TranscoderService {
  /**
   * Stream extract audio track from video read stream to audio write stream
   * @param {NodeJS.ReadableStream} readStream - Video read stream
   * @param {NodeJS.WritableStream} writeStream - Audio write stream
   * @param {string} videoFileName - Original video filename to infer extension
   * @returns {Promise<void>}
   */
  extractAudio(readStream, writeStream, videoFileName) {
    return new Promise((resolve, reject) => {
      // Inferred input format
      let ext = path.extname(videoFileName).substring(1).toLowerCase();
      if (!ext || ext === 'status' || ext === 'json') {
        ext = 'mp4'; // fallback
      }

      // Configure ffmpeg to extract mono channel, 16kHz WAV audio track
      ffmpeg(readStream)
        .inputFormat(ext)
        .toFormat('wav')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('start', (commandLine) => {
          console.log(`[Transcoder] Spawned ffmpeg with command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent !== undefined) {
            console.log(`[Transcoder] Processing: ${Math.round(progress.percent)}% done`);
          }
        })
        .on('error', (err, stdout, stderr) => {
          console.error('[Transcoder] ffmpeg error:', err.message);
          console.error('[Transcoder] ffmpeg stderr:', stderr);
          reject(err);
        })
        .on('end', () => {
          console.log('[Transcoder] Audio extraction finished successfully');
          resolve();
        })
        .pipe(writeStream, { end: true });
    });
  }
}

module.exports = new TranscoderService();
