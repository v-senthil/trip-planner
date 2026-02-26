import config from '../config.js';
import logger from '../logger.js';
import cacheService from './cacheService.js';
import dbService from './dbService.js';

/** Returns the effective OpenWeather API key (DB-stored wins over .env). */
function getWeatherKey() {
  try {
    const dbKey = dbService.getApiKey('OPENWEATHER_API_KEY');
    if (dbKey) return dbKey;
  } catch { /* fall through */ }
  return config.weather.apiKey || null;
}

/**
 * Get current weather and forecast for a city.
 */
/**
 * Extract the first/main city name from a compound destination string.
 * e.g. "Da Lat & Mui Ne (via Ho Chi Minh City)" → "Da Lat"
 *      "Bali, Indonesia" → "Bali"
 */
function extractMainCity(destination) {
  let city = destination;
  // Remove parenthetical parts
  city = city.replace(/\s*\(.*?\)\s*/g, '').trim();
  // Split on common separators and take the first part
  city = city.split(/\s*[&,;/]\s*/)[0].trim();
  return city || destination;
}

export async function getWeather(city) {
  const weatherKey = getWeatherKey();
  if (!weatherKey) {
    logger.warn('OpenWeather API key not configured');
    return null;
  }

  // Try the full city name first, fallback to extracted main city
  const candidates = [city];
  const main = extractMainCity(city);
  if (main !== city) candidates.push(main);

  const cacheKey = cacheService.generateKey('weather', city);
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  try {
    let currentRes, currentData;
    for (const candidate of candidates) {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(candidate)}&units=metric&appid=${weatherKey}`;
      currentRes = await fetch(url);
      if (currentRes.ok) {
        currentData = await currentRes.json();
        break;
      }
      logger.info(`Weather: "${candidate}" not found, trying next candidate`);
    }
    if (!currentData) throw new Error(`Weather API: no matching city for "${city}"`);
    const current = currentData;

    // Get 5-day forecast using lat/lon from the current weather response (always matches)
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${current.coord.lat}&lon=${current.coord.lon}&units=metric&appid=${weatherKey}`;
    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) throw new Error(`Forecast API: ${forecastRes.status}`);
    const forecast = await forecastRes.json();

    // Process forecast into daily summaries
    const dailyForecast = {};
    for (const item of forecast.list) {
      const date = item.dt_txt.split(' ')[0];
      if (!dailyForecast[date]) {
        dailyForecast[date] = {
          date,
          tempMin: item.main.temp_min,
          tempMax: item.main.temp_max,
          weather: item.weather[0].main,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          humidity: item.main.humidity,
          windSpeed: item.wind.speed,
          rain: item.rain?.['3h'] || 0,
        };
      } else {
        dailyForecast[date].tempMin = Math.min(dailyForecast[date].tempMin, item.main.temp_min);
        dailyForecast[date].tempMax = Math.max(dailyForecast[date].tempMax, item.main.temp_max);
        dailyForecast[date].rain += item.rain?.['3h'] || 0;
      }
    }

    const result = {
      current: {
        temp: current.main.temp,
        feelsLike: current.main.feels_like,
        humidity: current.main.humidity,
        weather: current.weather[0].main,
        description: current.weather[0].description,
        icon: current.weather[0].icon,
        windSpeed: current.wind.speed,
        city: current.name,
        country: current.sys.country,
      },
      forecast: Object.values(dailyForecast),
      isRainy: current.weather[0].main.toLowerCase().includes('rain'),
      isHot: current.main.temp > 35,
      isCold: current.main.temp < 10,
    };

    cacheService.set(cacheKey, result, 1800); // 30 min cache
    return result;
  } catch (err) {
    logger.error(`Weather fetch failed for ${city}: ${err.message}`);
    return null;
  }
}

/**
 * Get weather-based activity suggestions.
 */
export function getWeatherAdvice(weather) {
  if (!weather) return null;

  const advice = [];
  if (weather.isRainy) {
    advice.push('Rain expected — pack an umbrella and consider indoor attractions');
    advice.push('Museums, galleries, and covered markets are great rainy-day options');
  }
  if (weather.isHot) {
    advice.push('High temperatures — stay hydrated and plan outdoor activities for early morning');
    advice.push('Consider air-conditioned venues during 12-3 PM');
  }
  if (weather.isCold) {
    advice.push('Cold weather — layer up and pack warm clothing');
    advice.push('Hot drinks and cozy cafes make great stops between sightseeing');
  }

  return {
    conditions: weather.current.description,
    temp: weather.current.temp,
    advice,
    recommendIndoor: weather.isRainy || weather.isHot,
  };
}

export default { getWeather, getWeatherAdvice };
