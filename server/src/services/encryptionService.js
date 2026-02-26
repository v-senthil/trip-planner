/**
 * AES-256-GCM symmetric encryption for storing API keys in SQLite.
 *
 * Encrypted format stored in DB:  <hex iv>:<hex authTag>:<hex ciphertext>
 *
 * The encryption key is derived from ENCRYPTION_SECRET env var.
 * If the var is absent (dev / CI without .env) a hard-coded dev fallback
 * is used — this is intentional; any stored cipher-text is still opaque
 * inside the DB row but DO NOT use the fallback in production.
 */

import crypto from 'crypto';
import logger from '../logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES   = 12;   // 96-bit IV for GCM
const TAG_BYTES  = 16;   // 128-bit auth tag

// Derive a 32-byte key deterministically from the secret string.
const RAW_SECRET = process.env.ENCRYPTION_SECRET || 'tripplanner-dev-secret-change-me!';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(RAW_SECRET).digest(); // 32 bytes

if (!process.env.ENCRYPTION_SECRET) {
  logger.warn('⚠️  ENCRYPTION_SECRET not set — using dev fallback. Set it in production!');
}

/**
 * Encrypt a plain-text string.
 * @param {string} plainText
 * @returns {string}  "<iv hex>:<authTag hex>:<ciphertext hex>"
 */
export function encrypt(plainText) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv, { authTagLength: TAG_BYTES });
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a value created by encrypt().
 * @param {string} stored  "<iv hex>:<authTag hex>:<ciphertext hex>"
 * @returns {string}  original plain-text
 */
export function decrypt(stored) {
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format');
  const [ivHex, tagHex, ctHex] = parts;
  const iv       = Buffer.from(ivHex,  'hex');
  const authTag  = Buffer.from(tagHex, 'hex');
  const ct       = Buffer.from(ctHex,  'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv, { authTagLength: TAG_BYTES });
  decipher.setAuthTag(authTag);
  return decipher.update(ct, undefined, 'utf8') + decipher.final('utf8');
}

/**
 * Build a masked hint from a key value for safe display.
 * e.g. "AIzaSyABC...XYZ" → "••••XYZ"
 */
export function maskKey(plainText) {
  if (!plainText || plainText.length < 4) return '••••';
  return `••••${plainText.slice(-4)}`;
}
