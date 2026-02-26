/**
 * GET  /api/settings/api-keys          — list stored key names + hints (no decrypted values)
 * GET  /api/settings/api-keys/:name    — check if a specific key is configured
 * PUT  /api/settings/api-keys/:name    — save / update a key (plaintext in body, stored encrypted)
 * DELETE /api/settings/api-keys/:name  — remove a key
 */

import { Router } from 'express';
import dbService from '../services/dbService.js';
import logger from '../logger.js';

const router = Router();

// Known keys that the app uses — used to build the full list including unconfigured ones
const KNOWN_KEYS = ['GEMINI_API_KEY', 'OPENWEATHER_API_KEY'];

/** GET /api/settings/api-keys */
router.get('/api-keys', (req, res, next) => {
  try {
    const stored = dbService.listApiKeys();                        // keys actually in DB
    const storedMap = Object.fromEntries(stored.map((k) => [k.name, k]));

    // Merge known keys so the UI always shows every expected entry
    const keys = KNOWN_KEYS.map((name) =>
      storedMap[name]
        ? { name, hint: storedMap[name].hint, configured: true, updatedAt: storedMap[name].updatedAt }
        : { name, hint: null, configured: false, updatedAt: null },
    );

    // Append any extra keys the user may have stored manually
    for (const k of stored) {
      if (!KNOWN_KEYS.includes(k.name)) {
        keys.push({ name: k.name, hint: k.hint, configured: true, updatedAt: k.updatedAt });
      }
    }

    res.json({ success: true, keys });
  } catch (err) { next(err); }
});

/** PUT /api/settings/api-keys/:name — saves encrypted */
router.put('/api-keys/:name', (req, res, next) => {
  try {
    const { name } = req.params;
    const { value } = req.body;

    if (!value || typeof value !== 'string' || value.trim() === '') {
      return res.status(400).json({ error: true, message: 'value is required and must be a non-empty string' });
    }

    // Validate key name to avoid injection-style names
    if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(name)) {
      return res.status(400).json({ error: true, message: 'Invalid key name format' });
    }

    dbService.saveApiKey(name, value.trim());
    logger.info(`API key "${name}" saved (encrypted)`);

    // Return the updated entry (no plain value)
    const [updated] = dbService.listApiKeys().filter((k) => k.name === name);
    res.json({ success: true, key: { name, hint: updated?.hint, configured: true, updatedAt: updated?.updatedAt } });
  } catch (err) { next(err); }
});

/** DELETE /api/settings/api-keys/:name */
router.delete('/api-keys/:name', (req, res, next) => {
  try {
    dbService.deleteApiKey(req.params.name);
    logger.info(`API key "${req.params.name}" deleted`);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
