import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import aiService from '../services/aiService.js';
import placesService from '../services/placesService.js';
import routingService from '../services/routingService.js';
import clusteringService from '../services/clusteringService.js';
import pdfService from '../services/pdfService.js';
import dbService from '../services/dbService.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import logger from '../logger.js';

const router = Router();

/**
 * POST /api/trips/plan
 * Generate a full trip itinerary.
 */
router.post('/plan', aiLimiter, async (req, res, next) => {
  try {
    const {
      destination,
      days,
      startDate,
      endDate,
      budget,
      vacationType,
      travelPace,
      foodPreference,
      transportType,
      accommodationArea,
      mood,
      customVacationType,
    } = req.body;

    if (!destination || !startDate || !endDate) {
      return res.status(400).json({ error: true, message: 'destination, startDate and endDate are required' });
    }

    // Calculate days from dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const calculatedDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    logger.info(`Planning trip: ${destination}, ${startDate} to ${endDate} (${calculatedDays} days), budget=${budget}`);

    // 1. Generate AI itinerary
    const itinerary = await aiService.generateItinerary({
      destination,
      days: calculatedDays,
      startDate,
      endDate,
      budget,
      vacationType,
      travelPace,
      foodPreference,
      transportType,
      accommodationArea,
      mood,
      customVacationType,
    });

    // Ensure dates are on each day if AI didn't add them
    if (itinerary.days) {
      itinerary.days.forEach((day, idx) => {
        if (!day.date) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + idx);
          day.date = d.toISOString().split('T')[0];
        }
      });
    }

    // Store startDate/endDate on itinerary for frontend
    itinerary.startDate = startDate;
    itinerary.endDate = endDate;

    // 2. Geocode all places in the itinerary
    if (itinerary.days) {
      for (const day of itinerary.days) {
        if (!day.activities) continue;

        const places = day.activities.map((a) => ({ name: a.name }));
        const geocoded = await placesService.batchGeocode(places, destination);

        for (let i = 0; i < day.activities.length; i++) {
          if (geocoded[i]?.coordinates) {
            day.activities[i].coordinates = geocoded[i].coordinates;
            day.activities[i].geocoded = geocoded[i].geocoded !== false;
            if (geocoded[i].approximate) {
              day.activities[i].approximate = true;
            }
          }
        }

        // 3. Get routes between consecutive activities
        const waypoints = day.activities
          .filter((a) => a.coordinates)
          .map((a) => a.coordinates);

        if (waypoints.length >= 2) {
          try {
            const routeData = await routingService.getMultiRoute(waypoints);
            day.route = routeData;

            // Attach travel times to activities
            if (routeData?.legs) {
              for (let i = 1; i < day.activities.length; i++) {
                const leg = routeData.legs[i - 1];
                if (leg) {
                  day.activities[i].travelFromPrevious = {
                    minutes: leg.durationMin,
                    distanceKm: leg.distanceKm,
                    method: 'drive',
                  };
                }
              }
            }
          } catch (routeErr) {
            logger.warn(`Route calculation failed for day ${day.day}: ${routeErr.message}`);
          }
        }

        // 4. Calculate energy level
        const totalTravel = day.route?.totalDurationMin || 0;
        day.energyLevel = clusteringService.calculateEnergyLevel(day.activities, totalTravel);
      }
    }

    // Auto-save to DB
    const tripId = uuidv4();
    itinerary.id = tripId;
    try {
      dbService.saveTrip(tripId, req.body, itinerary);
      logger.info(`Trip saved to DB: ${tripId}`);
    } catch (dbErr) {
      logger.warn(`DB save failed (non-blocking): ${dbErr.message}`);
    }

    res.json({ success: true, itinerary });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/trips/regenerate-day
 */
router.post('/regenerate-day', aiLimiter, async (req, res, next) => {
  try {
    const { destination, dayNumber, existingDays, preferences } = req.body;
    if (!destination || !dayNumber) {
      return res.status(400).json({ error: true, message: 'destination and dayNumber required' });
    }

    const newDay = await aiService.regenerateDay(
      destination, dayNumber, existingDays || [], preferences || {}
    );

    // Geocode the new day's places
    if (newDay.activities) {
      const places = newDay.activities.map((a) => ({ name: a.name }));
      const geocoded = await placesService.batchGeocode(places, destination);
      for (let i = 0; i < newDay.activities.length; i++) {
        if (geocoded[i]?.coordinates) {
          newDay.activities[i].coordinates = geocoded[i].coordinates;
          newDay.activities[i].geocoded = geocoded[i].geocoded !== false;
          if (geocoded[i].approximate) {
            newDay.activities[i].approximate = true;
          }
        }
      }
    }

    res.json({ success: true, day: newDay });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/trips/swap-attraction
 * Get an alternative for a specific activity.
 */
router.post('/swap-attraction', aiLimiter, async (req, res, next) => {
  try {
    const { destination, currentPlace, slot, vacationType, budget } = req.body;
    const alternative = await aiService.swapAttraction(
      destination, currentPlace, slot, vacationType, budget
    );

    // Geocode the alternative
    const geocoded = await placesService.searchPlace(alternative.name, destination);
    if (geocoded) {
      alternative.coordinates = { lat: geocoded.lat, lng: geocoded.lng };
      alternative.geocoded = true;
      alternative.approximate = false;
    }

    res.json({ success: true, alternative });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/trips/optimize-route
 * Reorder a day's activities for shortest travel.
 */
router.post('/optimize-route', async (req, res, next) => {
  try {
    const { waypoints } = req.body;
    if (!waypoints?.length) {
      return res.status(400).json({ error: true, message: 'waypoints required' });
    }

    const optimized = await routingService.optimizeRoute(waypoints);
    const route = await routingService.getMultiRoute(optimized);

    res.json({ success: true, optimizedWaypoints: optimized, route });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/trips/packing-list
 * Generate a smart packing list.
 */
router.post('/packing-list', aiLimiter, async (req, res, next) => {
  try {
    const packingList = await aiService.generatePackingList(req.body);
    res.json({ success: true, packingList });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/trips/transport-guide
 * Get local transport guide.
 */
router.post('/transport-guide', async (req, res, next) => {
  try {
    const { destination } = req.body;
    if (!destination) {
      return res.status(400).json({ error: true, message: 'destination required' });
    }
    const guide = await aiService.generateTransportGuide(destination);
    res.json({ success: true, guide });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/trips/pdf
 * Generate PDF of the itinerary.
 */
router.post('/pdf', async (req, res, next) => {
  try {
    const { itinerary } = req.body;
    if (!itinerary) {
      return res.status(400).json({ error: true, message: 'itinerary required' });
    }

    const pdfBuffer = await pdfService.generateItineraryPDF(itinerary);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="trip-${itinerary.destination || 'plan'}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

export default router;
