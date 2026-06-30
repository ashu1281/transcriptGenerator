const { GoogleGenAI } = require('@google/genai');
const config = require('../config');
const logger = require('./logger');

class GeminiService {
  constructor() {
    this.client = new GoogleGenAI({
      vertexai: true,
      project: config.gcpProjectId,
      location: config.location
    });
    this.model = config.geminiModel; // default: 'gemini-2.5-pro'
  }

  /**
   * Transcribe an audio file stored in GCS
   * @param {string} audioGcsPath - Path of transcoded audio file in GCS
   * @returns {Promise<{text: string, json: Object}>}
   */
  async transcribeAudio(audioGcsPath) {
    const startTime = Date.now();
    try {
      const gcsUri = `gs://${config.gcsBucketName}/${audioGcsPath}`;
      logger.log(`[Gemini] Starting transcription process...`);
      logger.log(`[Gemini] Target GCS URI: "${gcsUri}"`);
      logger.log(`[Gemini] Model configuration: "${this.model}"`);

      const prompt = `
        Provide a complete, word-for-word transcript of this audio file.
        Detect distinct speakers and label them (e.g., "Speaker A", "Speaker B").
        Include approximate start and end timestamps for each segment.

        Return ONLY a JSON object matching this schema (do not wrap in markdown):
        {
          "fullText": "the entire combined transcript text",
          "segments": [
            {
              "speaker": "Speaker A",
              "text": "text spoken in this segment...",
              "start": "00:00:15",
              "end": "00:00:25"
            }
          ]
        }
      `;

      logger.log(`[Gemini] Calling Gemini generateContent API (this might take a few moments)...`);
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                fileData: {
                  fileUri: gcsUri,
                  mimeType: 'audio/wav'
                }
              },
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.log(`[Gemini] API Response received in ${duration}s.`);

      const rawText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        logger.error('[Gemini] Failed response structure: ', JSON.stringify(response, null, 2));
        throw new Error('Received empty response from Gemini API');
      }

      logger.log(`[Gemini] Raw response text length: ${rawText.length} characters.`);
      logger.log(`[Gemini] Response snippet: \n---\n${rawText.substring(0, 300)}${rawText.length > 300 ? '\n...[truncated]...' : ''}\n---`);

      let parsedJson;
      try {
        parsedJson = JSON.parse(rawText.trim());
        logger.log(`[Gemini] Successfully parsed response as valid JSON.`);
        logger.log(`[Gemini] Combined text word count: ${parsedJson.fullText?.split(/\s+/).length || 0} words.`);
        logger.log(`[Gemini] Segment count detected: ${parsedJson.segments?.length || 0} segments.`);
      } catch (err) {
        logger.warn('[Gemini] Response was not valid JSON, falling back to raw text. Raw output:', rawText);
        parsedJson = {
          fullText: rawText,
          segments: []
        };
      }

      // Create a formatted human-readable plain text version
      let plainText = '';
      if (parsedJson.segments && Array.isArray(parsedJson.segments) && parsedJson.segments.length > 0) {
        plainText = parsedJson.segments
          .map(seg => `[${seg.start || '00:00'} - ${seg.end || '00:00'}] ${seg.speaker || 'Unknown'}: ${seg.text}`)
          .join('\n\n');
      } else {
        plainText = parsedJson.fullText;
      }

      logger.log('[Gemini] Finished formatting transcription output.');
      return {
        text: plainText,
        json: parsedJson
      };
    } catch (error) {
      logger.error('[Gemini] Transcription error:', error);
      throw error;
    }
  }
}

module.exports = new GeminiService();
