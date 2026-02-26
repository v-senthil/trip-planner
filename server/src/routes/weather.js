import { Router } from 'express';
import weatherService from '../services/weatherService.js';

const router = Router();

/**
 * GET /api/weather/:city
 */
router.get('/:city', async (req, res, next) => {
  try {
    const { city } = req.params;
    const weather = await weatherService.getWeather(city);

    if (!weather) {
      return res.status(404).json({ error: true, message: 'Weather data not available' });
    }

    const advice = weatherService.getWeatherAdvice(weather);
    res.json({ success: true, weather, advice });
  } catch (err) {
    next(err);
  }
});

export default router;
