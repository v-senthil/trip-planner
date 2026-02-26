import { Router } from 'express';
import dbService from '../services/dbService.js';
import placesService from '../services/placesService.js';
import config from '../config.js';
import logger from '../logger.js';

const router = Router();

// ─── Trip CRUD ───────────────────────────────────────────────────────────────

/** GET /api/db/trips — list all saved trips */
router.get('/trips', (req, res, next) => {
  try {
    const trips = dbService.listTrips();
    res.json({ success: true, trips });
  } catch (err) { next(err); }
});

/** GET /api/db/trips/:id — load full trip */
router.get('/trips/:id', (req, res, next) => {
  try {
    const trip = dbService.loadTrip(req.params.id);
    if (!trip) return res.status(404).json({ error: true, message: 'Trip not found' });
    res.json({ success: true, trip });
  } catch (err) { next(err); }
});

/** POST /api/db/trips — save a trip (full itinerary + formData) */
router.post('/trips', (req, res, next) => {
  try {
    const { tripId, formData, itinerary } = req.body;
    if (!tripId || !itinerary) {
      return res.status(400).json({ error: true, message: 'tripId and itinerary are required' });
    }
    dbService.saveTrip(tripId, formData || {}, itinerary);
    res.json({ success: true, tripId });
  } catch (err) { next(err); }
});

/** DELETE /api/db/trips/:id */
router.delete('/trips/:id', (req, res, next) => {
  try {
    dbService.deleteTrip(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Day management ──────────────────────────────────────────────────────────

/** POST /api/db/trips/:id/days — add a new day */
router.post('/trips/:id/days', (req, res, next) => {
  try {
    const { date } = req.body;
    const day = dbService.addDay(req.params.id, date || null);
    res.json({ success: true, day });
  } catch (err) { next(err); }
});

/** DELETE /api/db/trips/:id/days/:dayNumber — remove a day */
router.delete('/trips/:id/days/:dayNumber', (req, res, next) => {
  try {
    dbService.removeDay(req.params.id, parseInt(req.params.dayNumber, 10));
    // Return refreshed trip
    const trip = dbService.loadTrip(req.params.id);
    res.json({ success: true, itinerary: trip });
  } catch (err) { next(err); }
});

// ─── Activity management ─────────────────────────────────────────────────────

/** POST /api/db/trips/:id/days/:dayNumber/activities — add activity */
router.post('/trips/:id/days/:dayNumber/activities', async (req, res, next) => {
  try {
    const { name, type, timeStart, timeEnd, estimatedMinutes, description, budgetEstimate, tips, slot, insertAtIndex } = req.body;

    if (!name) {
      return res.status(400).json({ error: true, message: 'name is required' });
    }

    // Geocode the new place
    let coordinates = null;
    let geocoded = false;
    let approximate = false;
    const tripData = dbService.loadTrip(req.params.id);
    if (tripData) {
      try {
        const geo = await placesService.searchPlace(name, tripData.destination);
        if (geo) {
          coordinates = { lat: geo.lat, lng: geo.lng };
          geocoded = true;
        }
      } catch (e) {
        logger.warn(`Geocoding failed for added place "${name}": ${e.message}`);
      }
    }

    const activity = dbService.addActivity(
      req.params.id,
      parseInt(req.params.dayNumber, 10),
      {
        name,
        type: type || 'attraction',
        timeStart: timeStart || null,
        timeEnd: timeEnd || null,
        estimatedMinutes: estimatedMinutes || 60,
        description: description || '',
        budgetEstimate: budgetEstimate || '',
        tips: tips || '',
        slot: slot || null,
        coordinates,
      },
      insertAtIndex != null ? parseInt(insertAtIndex, 10) : undefined,
    );

    // Return the activity with coordinates and geocode status
    activity.coordinates = coordinates;
    activity.geocoded = geocoded;
    activity.approximate = approximate;

    res.json({ success: true, activity });
  } catch (err) { next(err); }
});

/** DELETE /api/db/trips/:id/activities/:activityId — remove activity */
router.delete('/trips/:id/activities/:activityId', (req, res, next) => {
  try {
    dbService.removeActivity(req.params.id, parseInt(req.params.activityId, 10));
    res.json({ success: true });
  } catch (err) { next(err); }
});

/** PATCH /api/db/trips/:id/activities/:activityId — update activity fields */
router.patch('/trips/:id/activities/:activityId', (req, res, next) => {
  try {
    const activityId = parseInt(req.params.activityId, 10);
    const fields = req.body; // { name, type, description, budgetEstimate, tips, etc. }
    dbService.updateActivity(req.params.id, activityId, fields);
    res.json({ success: true });
  } catch (err) { next(err); }
});

/** PATCH /api/db/trips/:id/activities/:activityId/coordinates — update coordinates manually */
router.patch('/trips/:id/activities/:activityId/coordinates', (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ error: true, message: 'lat and lng are required' });
    }
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (isNaN(numLat) || isNaN(numLng) || numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
      return res.status(400).json({ error: true, message: 'Invalid lat/lng values' });
    }

    dbService.updateActivityCoordinates(
      req.params.id,
      parseInt(req.params.activityId, 10),
      numLat,
      numLng,
    );

    res.json({ success: true, coordinates: { lat: numLat, lng: numLng } });
  } catch (err) { next(err); }
});

/** POST /api/db/trips/:id/activities/:activityId/geocode — re-geocode an activity by name */
router.post('/trips/:id/activities/:activityId/geocode', async (req, res, next) => {
  try {
    const { searchQuery } = req.body;
    if (!searchQuery) {
      return res.status(400).json({ error: true, message: 'searchQuery required' });
    }

    const tripData = dbService.loadTrip(req.params.id);
    const destination = tripData?.destination || '';

    const geo = await placesService.searchPlace(searchQuery, destination);
    if (!geo) {
      return res.json({ success: false, message: 'Location not found. Try different search terms or enter coordinates manually.' });
    }

    const lat = geo.lat;
    const lng = geo.lng;
    dbService.updateActivityCoordinates(
      req.params.id,
      parseInt(req.params.activityId, 10),
      lat,
      lng,
    );

    res.json({ success: true, coordinates: { lat, lng } });
  } catch (err) { next(err); }
});

// ─── Packing list & transport guide ──────────────────────────────────────────

/** GET /api/db/trips/:id/packing-list */
router.get('/trips/:id/packing-list', (req, res, next) => {
  try {
    const data = dbService.getPackingList(req.params.id);
    res.json({ success: true, packingList: data });
  } catch (err) { next(err); }
});

/** POST /api/db/trips/:id/packing-list */
router.post('/trips/:id/packing-list', (req, res, next) => {
  try {
    const { packingList } = req.body;
    dbService.savePackingList(req.params.id, packingList);
    res.json({ success: true });
  } catch (err) { next(err); }
});

/** GET /api/db/trips/:id/transport-guide */
router.get('/trips/:id/transport-guide', (req, res, next) => {
  try {
    const data = dbService.getTransportGuide(req.params.id);
    res.json({ success: true, guide: data });
  } catch (err) { next(err); }
});

/** POST /api/db/trips/:id/transport-guide */
router.post('/trips/:id/transport-guide', (req, res, next) => {
  try {
    const { guide } = req.body;
    dbService.saveTransportGuide(req.params.id, guide);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Settings ────────────────────────────────────────────────────────────────

/** GET /api/db/settings */
router.get('/settings', (req, res, next) => {
  try {
    const settings = dbService.getSettings();
    res.json({ success: true, settings });
  } catch (err) { next(err); }
});

/** PUT /api/db/settings */
router.put('/settings', (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: true, message: 'settings object required' });
    }
    dbService.saveSettings(settings);
    res.json({ success: true });
  } catch (err) { next(err); }
});

/** PATCH /api/db/settings/:key */
router.patch('/settings/:key', (req, res, next) => {
  try {
    const { value } = req.body;
    dbService.saveSetting(req.params.key, value);
    res.json({ success: true });
  } catch (err) { next(err); }
});

/** GET /api/db/ai-providers — list available AI providers and their models */
router.get('/ai-providers', (req, res) => {
  const providers = Object.entries(config.ai.providers).map(([id, p]) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    available: !!p.apiKey && p.apiKey !== `sk-your-${id}-api-key`,
    models: p.models,
  }));
  res.json({ success: true, providers, defaultProvider: config.ai.defaultProvider, defaultModel: config.ai.defaultModel });
});

export default router;
