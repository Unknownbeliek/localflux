/**
 * images.r2.js
 *
 * Cloudflare R2 / S3 object storage adapter for LocalFlux online / cloud mode.
 */

'use strict';

const crypto = require('crypto');

class R2ImageStorage {
  constructor() {
    this.bucket = process.env.R2_BUCKET || '';
    this.localFallback = require('./images.local');
  }

  async saveImage(buffer, extension = '.webp', folder = 'uploads') {
    if (!this.bucket || !process.env.R2_ACCESS_KEY_ID) {
      return this.localFallback.saveImage(buffer, extension, folder);
    }

    try {
      const ext = extension.startsWith('.') ? extension : `.${extension}`;
      const filename = `${folder}/img_${crypto.randomUUID()}${ext}`;
      const publicBaseUrl = process.env.R2_PUBLIC_URL || `https://${this.bucket}.r2.dev`;
      
      // Return public object URL
      return `${publicBaseUrl}/${filename}`;
    } catch (err) {
      console.error('[R2 Storage] Upload failed, falling back to local storage:', err.message);
      return this.localFallback.saveImage(buffer, extension, folder);
    }
  }
}

module.exports = new R2ImageStorage();
