import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // AI providers — keys loaded from .env, model selection from settings DB
  ai: {
    defaultProvider: 'gemini',
    defaultModel: 'gemini-2.5-pro',
    maxTokens: 65536,
    providers: {
      gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        models: [
          { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
          { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
          { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        ],
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        models: [
          { id: 'gpt-4o', label: 'GPT-4o' },
          { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
          { id: 'gpt-4.1', label: 'GPT-4.1' },
          { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
          { id: 'o3-mini', label: 'o3-mini' },
        ],
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        models: [
          { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
          { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
          { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
        ],
      },
      perplexity: {
        apiKey: process.env.PERPLEXITY_API_KEY,
        baseUrl: 'https://api.perplexity.ai',
        models: [
          { id: 'sonar-pro', label: 'Sonar Pro' },
          { id: 'sonar', label: 'Sonar' },
          { id: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro' },
        ],
      },
    },
  },

  // Legacy alias (kept for backward compat)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-pro',
    maxTokens: 65536,
  },

  // Open-source map services (no API keys required)
  nominatim: {
    baseUrl: 'https://nominatim.openstreetmap.org',
    userAgent: 'TripPlanner/1.0',
    rateLimit: 1000, // 1 request per second
  },

  osrm: {
    baseUrl: 'https://router.project-osrm.org',
  },

  overpass: {
    baseUrl: 'https://overpass-api.de/api/interpreter',
  },

  weather: {
    apiKey: process.env.OPENWEATHER_API_KEY,
  },

  cache: {
    stdTTL: 86400,
    checkperiod: 3600,
    maxKeys: 5000,
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },

  // ─── Auth (single-user) ───────────────────────────────────────────────────
  auth: {
    email:        (process.env.AUTH_EMAIL    || 'senthil@gmail.com').toLowerCase(),
    password:      process.env.AUTH_PASSWORD  || 'AmiSenthil@d1206',
    jwtSecret:     process.env.JWT_SECRET     || 'tripplanner-jwt-secret-change-in-prod-2026',
    jwtExpiresIn:  process.env.JWT_EXPIRES_IN || '7d',
  },
};

export default config;
