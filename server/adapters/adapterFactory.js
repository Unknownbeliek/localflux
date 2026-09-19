/**
 * adapterFactory.js
 *
 * Selects and exposes the appropriate storage adapters based on environment variables.
 */

'use strict';

const memoryStore = require('./storage.memory');
const redisStore = require('./storage.redis');
const localImages = require('./images.local');
const r2Images = require('./images.r2');

function getRoomStorage() {
  const mode = (process.env.STORAGE_MODE || 'memory').toLowerCase();
  if (mode === 'redis') {
    return redisStore;
  }
  return memoryStore;
}

function getImageStorage() {
  if (process.env.R2_BUCKET) {
    return r2Images;
  }
  return localImages;
}

module.exports = {
  getRoomStorage,
  getImageStorage,
};
