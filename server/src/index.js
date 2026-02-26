import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Trust proxy (needed for express-rate-limit behind reverse proxies / ngrok)
app.set('trust proxy', 1);

// Security & compression
app.use(helmet());
app.use(compression());

// CORS — allow multiple origins (local dev + GitHub Pages + custom domains)
app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no origin) and any origin in the whitelist
    if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
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

// ── Serve the Vite-built frontend in production ──────────────────────────
// In production, the client build lives at ../client/dist (relative to server/)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (config.nodeEnv === 'production') {
  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(clientDist));

  // SPA fallback — any non-API route returns index.html so React Router works
  app.get('*', (req, res, next) => {
    // Don't intercept /api/* — let those fall through to 404 handler
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

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
