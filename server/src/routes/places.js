import { Router } from 'express';
import placesService from '../services/placesService.js';
import cacheService from '../services/cacheService.js';

const router = Router();

/**
 * GET /api/places/geocode?q=city+name
 */
router.get('/geocode', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: true, message: 'q parameter required' });

    const results = await placesService.geocode(q);
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/places/search?name=place&city=city
 */
router.get('/search', async (req, res, next) => {
  try {
    const { name, city } = req.query;
    if (!name || !city) {
      return res.status(400).json({ error: true, message: 'name and city required' });
    }

    const result = await placesService.searchPlace(name, city);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/places/pois?lat=x&lng=y&radius=5000&types=beach,museum
 */
router.get('/pois', async (req, res, next) => {
  try {
    const { lat, lng, radius, types } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: true, message: 'lat and lng required' });
    }

    const typeArr = types ? types.split(',') : [];
    const results = await placesService.searchPOIs(
      parseFloat(lat), parseFloat(lng), parseInt(radius) || 5000, typeArr
    );
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/places/emergency?lat=x&lng=y
 */
router.get('/emergency', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: true, message: 'lat and lng required' });
    }

    const results = await placesService.searchEmergencyServices(
      parseFloat(lat), parseFloat(lng)
    );
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/places/timezone?lat=x&lng=y
 * Returns the timezone and current time for a location using timeapi.io
 */
router.get('/timezone', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: true, message: 'lat and lng required' });
    }

    const cacheKey = `tz:${parseFloat(lat).toFixed(2)}:${parseFloat(lng).toFixed(2)}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return res.json({ success: true, ...cached });

    const url = `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`;
    const tzRes = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!tzRes.ok) throw new Error(`TimeAPI failed: ${tzRes.status}`);
    const data = await tzRes.json();

    const result = {
      timezone: data.timeZone,
      currentTime: data.currentLocalTime,
      utcOffset: data.currentUtcOffset?.standardUtcOffset?.seconds != null
        ? data.currentUtcOffset.standardUtcOffset.seconds / 3600
        : null,
      hasDst: data.hasDayLightSaving || false,
      dstActive: data.isDayLightSavingActive || false,
    };

    cacheService.set(cacheKey, result);
    res.json({ success: true, ...result });
  } catch (err) {
    // Fallback: estimate from longitude
    const utcOffset = Math.round(parseFloat(req.query.lng) / 15);
    res.json({
      success: true,
      timezone: `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`,
      currentTime: null,
      utcOffset,
      estimated: true,
    });
  }
});

export default router;
