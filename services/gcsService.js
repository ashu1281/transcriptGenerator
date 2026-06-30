const { Storage } = require('@google-cloud/storage');
const config = require('../config');
const logger = require('./logger');

class GCSService {
  constructor() {
    this.storage = new Storage({
      projectId: config.gcpProjectId,
    });
    this.bucket = this.storage.bucket(config.gcsBucketName);
  }

  /**
   * Create a readable stream for a GCS file
   * @param {string} gcsPath - Path of the file in GCS
   * @returns {NodeJS.ReadableStream}
   */
  createReadStream(gcsPath) {
    logger.log(`[GCS] Opening readable stream for file: "gs://${config.gcsBucketName}/${gcsPath}"`);
    return this.bucket.file(gcsPath).createReadStream();
  }

  /**
   * Create a writable stream for a GCS file
   * @param {string} gcsPath - Path of the file in GCS
   * @param {string} contentType - MIME type of the file
   * @returns {NodeJS.WritableStream}
   */
  createWriteStream(gcsPath, contentType) {
    logger.log(`[GCS] Opening writable stream for file: "gs://${config.gcsBucketName}/${gcsPath}" (Content-Type: ${contentType})`);
    return this.bucket.file(gcsPath).createWriteStream({
      metadata: {
        contentType,
        metadata: {
          uploadedAt: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Upload text or json content to GCS
   * @param {string} gcsPath - Path of the file in GCS
   * @param {string} content - File content string
   * @param {string} contentType - MIME type
   */
  async uploadText(gcsPath, content, contentType = 'text/plain') {
    try {
      const file = this.bucket.file(gcsPath);
      await file.save(content, {
        metadata: {
          contentType,
          metadata: {
            uploadedAt: new Date().toISOString()
          }
        }
      });
      logger.log(`[GCS] Uploaded file: ${gcsPath}`);
      return { success: true, gcsPath };
    } catch (error) {
      logger.error(`[GCS] Upload error for ${gcsPath}:`, error);
      throw error;
    }
  }

  /**
   * Write status JSON file inside target output folder
   * @param {string} statusGcsPath - Custom target path for the status JSON
   * @param {string} videoGcsPath - Path of original video in GCS
   * @param {'processing' | 'completed' | 'failed'} status - Current status
   * @param {string} [errorMsg] - Error description if failed
   */
  async updateStatus(statusGcsPath, videoGcsPath, status, errorMsg = null) {
    const payload = {
      videoFile: videoGcsPath.split('/').pop(),
      bucket: config.gcsBucketName,
      status,
      error: errorMsg,
      updatedAt: new Date().toISOString()
    };
    try {
      await this.uploadText(statusGcsPath, JSON.stringify(payload, null, 2), 'application/json');
      logger.log(`[GCS] Status updated to '${status}' at: ${statusGcsPath}`);
    } catch (err) {
      logger.error(`[GCS] Failed to update status at ${statusGcsPath}:`, err);
    }
  }

  /**
   * Delete a file from GCS
   * @param {string} gcsPath - Path of the file in GCS
   */
  async deleteFile(gcsPath) {
    try {
      const file = this.bucket.file(gcsPath);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        logger.log(`[GCS] Deleted file: ${gcsPath}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`[GCS] Delete error for ${gcsPath}:`, error);
      throw error;
    }
  }
}

module.exports = new GCSService();
