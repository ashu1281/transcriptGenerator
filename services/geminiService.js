const { GoogleGenAI } = require('@google/genai');
const config = require('../config');

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
    try {
      const gcsUri = `gs://${config.gcsBucketName}/${audioGcsPath}`;
      console.log(`[Gemini] Requesting transcription for GCS file: ${gcsUri}`);

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

      const rawText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Received empty response from Gemini API');
      }

      let parsedJson;
      try {
        parsedJson = JSON.parse(rawText.trim());
      } catch (err) {
        console.warn('[Gemini] Response was not valid JSON, falling back to raw text. Raw output:', rawText);
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

      return {
        text: plainText,
        json: parsedJson
      };
    } catch (error) {
      console.error('[Gemini] Transcription error:', error);
      throw error;
    }
  }
}

module.exports = new GeminiService();
