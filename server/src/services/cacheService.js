import NodeCache from 'node-cache';
import config from '../config.js';
import logger from '../logger.js';

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: config.cache.stdTTL,
      checkperiod: config.cache.checkperiod,
      maxKeys: config.cache.maxKeys,
      useClones: false,
    });

    this.cache.on('expired', (key) => {
      logger.debug(`Cache key expired: ${key}`);
    });
  }

  get(key) {
    const value = this.cache.get(key);
    if (value) {
      logger.debug(`Cache hit: ${key}`);
    }
    return value;
  }

  set(key, value, ttl) {
    return this.cache.set(key, value, ttl || config.cache.stdTTL);
  }

  del(key) {
    return this.cache.del(key);
  }

  flush() {
    this.cache.flushAll();
  }

  getStats() {
    return this.cache.getStats();
  }

  generateKey(...parts) {
    return parts.map((p) => String(p).toLowerCase().trim()).join(':');
  }
}

export default new CacheService();
