import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import config from './config.js';
import logger from './logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import tripRoutes from './routes/trips.js';
import placeRoutes from './routes/places.js';
import routeRoutes from './routes/routeRoutes.js';
import weatherRoutes from './routes/weather.js';
import currencyRoutes from './routes/currency.js';
import dbRoutes from './routes/db.js';
import settingsRoutes from './routes/settingsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { requireAuth } from './middleware/authMiddleware.js';

const app = express();

// Trust proxy (needed for express-rate-limit behind reverse proxies / ngrok)
app.set('trust proxy', 1);

// Security & compression
app.use(helmet());
app.use(compression());

// CORS
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      maps: 'OpenStreetMap + Leaflet (open-source)',
      geocoding: 'Nominatim (open-source)',
      routing: 'OSRM (open-source)',
      pois: 'Overpass API (open-source)',
      ai: config.gemini.apiKey ? 'Gemini configured' : 'Not configured',
      weather: config.weather.apiKey ? 'OpenWeather configured' : 'Not configured',
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', requireAuth, tripRoutes);
app.use('/api/places', requireAuth, placeRoutes);
app.use('/api/routes', requireAuth, routeRoutes);
app.use('/api/weather', requireAuth, weatherRoutes);
app.use('/api/currency', requireAuth, currencyRoutes);
app.use('/api/db', requireAuth, dbRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  logger.info(`🚀 TripPlanner API running on port ${config.port}`);
  logger.info(`📍 Maps: OpenStreetMap + Leaflet (no API key needed)`);
  logger.info(`🗺️  Routing: OSRM (no API key needed)`);
  logger.info(`🔍 Geocoding: Nominatim (no API key needed)`);
  logger.info(`🤖 AI: ${config.gemini.apiKey ? 'Gemini ready' : '⚠️  GEMINI_API_KEY not set'}`);
  logger.info(`🌦️  Weather: ${config.weather.apiKey ? 'OpenWeather ready' : '⚠️  OPENWEATHER_API_KEY not set'}`);
});

export default app;
