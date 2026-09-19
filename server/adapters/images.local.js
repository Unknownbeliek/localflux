/**
 * images.local.js
 *
 * Local filesystem image storage adapter for LocalFlux offline / local development mode.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class LocalImageStorage {
  async saveImage(buffer, extension = '.webp', folder = 'uploads') {
    const publicDir = path.resolve(__dirname, '..', 'public', folder);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    const filename = `img_${crypto.randomUUID()}${ext}`;
    const filepath = path.join(publicDir, filename);
    fs.writeFileSync(filepath, buffer);
    return `/${folder}/${filename}`;
  }
}

module.exports = new LocalImageStorage();
