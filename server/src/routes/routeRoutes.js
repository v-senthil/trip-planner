import { Router } from 'express';
import routingService from '../services/routingService.js';

const router = Router();

/**
 * POST /api/routes/directions
 * Get route between two points.
 */
router.post('/directions', async (req, res, next) => {
  try {
    const { origin, destination, profile } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: true, message: 'origin and destination required' });
    }

    const route = await routingService.getRoute(origin, destination, profile || 'driving');
    res.json({ success: true, route });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/routes/multi
 * Get route through multiple waypoints.
 */
router.post('/multi', async (req, res, next) => {
  try {
    const { waypoints, profile } = req.body;
    if (!waypoints?.length || waypoints.length < 2) {
      return res.status(400).json({ error: true, message: 'At least 2 waypoints required' });
    }

    const route = await routingService.getMultiRoute(waypoints, profile || 'driving');
    res.json({ success: true, route });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/routes/matrix
 * Get distance/duration matrix.
 */
router.post('/matrix', async (req, res, next) => {
  try {
    const { points, profile } = req.body;
    if (!points?.length || points.length < 2) {
      return res.status(400).json({ error: true, message: 'At least 2 points required' });
    }

    const matrix = await routingService.getDistanceMatrix(points, profile || 'driving');
    res.json({ success: true, matrix });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/routes/optimize
 * Optimize waypoint order.
 */
router.post('/optimize', async (req, res, next) => {
  try {
    const { waypoints, profile } = req.body;
    if (!waypoints?.length) {
      return res.status(400).json({ error: true, message: 'waypoints required' });
    }

    const optimized = await routingService.optimizeRoute(waypoints, profile || 'driving');
    res.json({ success: true, waypoints: optimized });
  } catch (err) {
    next(err);
  }
});

export default router;
