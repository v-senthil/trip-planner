import config from '../config.js';
import logger from '../logger.js';
import cacheService from './cacheService.js';

const NOMINATIM_DELAY = config.nominatim.rateLimit;
let lastNominatimCall = 0;

async function nominatimThrottle() {
  const now = Date.now();
  const elapsed = now - lastNominatimCall;
  if (elapsed < NOMINATIM_DELAY) {
    await new Promise((r) => setTimeout(r, NOMINATIM_DELAY - elapsed));
  }
  lastNominatimCall = Date.now();
}

/**
 * Geocode a city/place name to coordinates using Nominatim.
 */
export async function geocode(query) {
  const cacheKey = cacheService.generateKey('geocode', query);
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  await nominatimThrottle();

  const url = new URL(`${config.nominatim.baseUrl}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': config.nominatim.userAgent },
  });

  if (!res.ok) {
    throw new Error(`Nominatim geocode failed: ${res.status}`);
  }

  const data = await res.json();
  const results = data.map((item) => ({
    name: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    type: item.type,
    address: item.address,
    boundingBox: item.boundingbox?.map(Number),
  }));

  cacheService.set(cacheKey, results);
  return results;
}

/**
 * Reverse geocode coordinates to an address.
 */
export async function reverseGeocode(lat, lng) {
  const cacheKey = cacheService.generateKey('reverse', lat, lng);
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  await nominatimThrottle();

  const url = new URL(`${config.nominatim.baseUrl}/reverse`);
  url.searchParams.set('lat', lat);
  url.searchParams.set('lon', lng);
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': config.nominatim.userAgent },
  });

  if (!res.ok) throw new Error(`Nominatim reverse failed: ${res.status}`);

  const data = await res.json();
  const result = {
    name: data.display_name,
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lon),
    address: data.address,
  };

  cacheService.set(cacheKey, result);
  return result;
}

/**
 * Search for POIs near a location using Overpass API.
 */
export async function searchPOIs(lat, lng, radiusMeters = 5000, types = []) {
  const cacheKey = cacheService.generateKey('pois', lat, lng, radiusMeters, types.join(','));
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const tagFilters = types.length > 0
    ? types.map((t) => `node["tourism"="${t}"](around:${radiusMeters},${lat},${lng});`).join('\n')
    : `
      node["tourism"](around:${radiusMeters},${lat},${lng});
      node["leisure"](around:${radiusMeters},${lat},${lng});
      node["amenity"~"restaurant|cafe|bar"](around:${radiusMeters},${lat},${lng});
    `;

  const query = `
    [out:json][timeout:25];
    (
      ${tagFilters}
    );
    out body;
  `;

  const res = await fetch(config.overpass.baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass query failed: ${res.status}`);

  const data = await res.json();
  const results = (data.elements || []).map((el) => ({
    id: el.id,
    name: el.tags?.name || 'Unnamed Place',
    lat: el.lat,
    lng: el.lon,
    type: el.tags?.tourism || el.tags?.leisure || el.tags?.amenity || 'unknown',
    tags: el.tags || {},
    openingHours: el.tags?.opening_hours || null,
    website: el.tags?.website || null,
    phone: el.tags?.phone || null,
    cuisine: el.tags?.cuisine || null,
  }));

  cacheService.set(cacheKey, results, 43200); // 12h cache
  return results;
}

/**
 * Search for a specific place by name near a city.
 * Tries multiple query strategies for better geocoding accuracy.
 */
export async function searchPlace(placeName, cityName) {
  const cacheKey = cacheService.generateKey('place', placeName, cityName);
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  // Try multiple search strategies in order of specificity
  const queries = [
    `${placeName}, ${cityName}`,                          // exact: "Tanah Lot, Bali"
    `${placeName.replace(/\s*\(.*?\)\s*/g, '')}, ${cityName}`, // strip parenthetical: "Tegallalang Rice Terrace, Bali"
    placeName,                                             // just the name (famous landmarks)
  ];

  for (const query of queries) {
    await nominatimThrottle();

    const url = new URL(`${config.nominatim.baseUrl}/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '3');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('extratags', '1');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': config.nominatim.userAgent },
    });

    if (!res.ok) continue;

    const data = await res.json();
    if (data.length > 0) {
      const item = data[0];
      const result = {
        name: placeName,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type,
        address: item.address,
        extratags: item.extratags || {},
      };

      cacheService.set(cacheKey, result);
      return result;
    }
  }

  return null;
}

/**
 * Search for nearby hospitals/emergency services.
 */
export async function searchEmergencyServices(lat, lng, radiusMeters = 10000) {
  const cacheKey = cacheService.generateKey('emergency', lat, lng);
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
      node["amenity"="police"](around:${radiusMeters},${lat},${lng});
    );
    out body;
  `;

  const res = await fetch(config.overpass.baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass emergency query failed: ${res.status}`);

  const data = await res.json();
  const results = (data.elements || []).map((el) => ({
    id: el.id,
    name: el.tags?.name || 'Unnamed',
    lat: el.lat,
    lng: el.lon,
    type: el.tags?.amenity,
    phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
    address: [el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', '),
  }));

  cacheService.set(cacheKey, results, 86400);
  return results;
}

/**
 * Batch geocode multiple place names for an itinerary.
 * Falls back to the destination's city coordinates for ungeocodable places.
 */
export async function batchGeocode(places, cityName) {
  // First, get the city center as a fallback reference point
  let cityCenter = null;
  try {
    const cityResults = await geocode(cityName);
    if (cityResults.length > 0) {
      cityCenter = { lat: cityResults[0].lat, lng: cityResults[0].lng };
    }
  } catch {
    // ignore
  }

  const results = [];
  for (const place of places) {
    try {
      const result = await searchPlace(place.name, cityName);
      if (result) {
        results.push({
          ...place,
          coordinates: { lat: result.lat, lng: result.lng },
          geocoded: true,
        });
      } else if (cityCenter) {
        // Use city center with a small random offset so markers don't stack
        logger.warn(`Geocode miss for "${place.name}" in ${cityName}, using city center fallback`);
        results.push({
          ...place,
          coordinates: {
            lat: cityCenter.lat + (Math.random() - 0.5) * 0.01,
            lng: cityCenter.lng + (Math.random() - 0.5) * 0.01,
          },
          geocoded: false,
          approximate: true,
        });
      } else {
        results.push({ ...place, coordinates: null, geocoded: false });
      }
    } catch (err) {
      logger.warn(`Failed to geocode "${place.name}": ${err.message}`);
      results.push({ ...place, coordinates: null, geocoded: false });
    }
  }
  return results;
}

export default {
  geocode,
  reverseGeocode,
  searchPOIs,
  searchPlace,
  searchEmergencyServices,
  batchGeocode,
};
