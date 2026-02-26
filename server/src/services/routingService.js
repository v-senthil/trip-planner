import config from '../config.js';
import logger from '../logger.js';
import cacheService from './cacheService.js';

/**
 * Get route between two points using OSRM.
 */
export async function getRoute(origin, destination, profile = 'driving') {
  const cacheKey = cacheService.generateKey(
    'route', origin.lat, origin.lng, destination.lat, destination.lng, profile
  );
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `${config.osrm.baseUrl}/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM route failed: ${res.status}`);

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`OSRM: no route found (${data.code})`);
  }

  const route = data.routes[0];
  const result = {
    distance: route.distance, // meters
    duration: route.duration, // seconds
    distanceKm: +(route.distance / 1000).toFixed(2),
    durationMin: +Math.ceil(route.duration / 60),
    geometry: route.geometry,
    steps: route.legs[0]?.steps?.map((s) => ({
      instruction: s.maneuver?.type,
      distance: s.distance,
      duration: s.duration,
      name: s.name,
    })),
  };

  cacheService.set(cacheKey, result, 43200);
  return result;
}

/**
 * Get routes for a sequence of waypoints (full day route).
 */
export async function getMultiRoute(waypoints, profile = 'driving') {
  if (waypoints.length < 2) return null;

  const cacheKey = cacheService.generateKey(
    'multiroute',
    waypoints.map((w) => `${w.lat},${w.lng}`).join('|'),
    profile
  );
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
  const url = `${config.osrm.baseUrl}/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM multi-route failed: ${res.status}`);

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`OSRM: no multi-route found`);
  }

  const route = data.routes[0];
  const legs = route.legs.map((leg, i) => ({
    from: waypoints[i],
    to: waypoints[i + 1],
    distance: leg.distance,
    duration: leg.duration,
    distanceKm: +(leg.distance / 1000).toFixed(2),
    durationMin: +Math.ceil(leg.duration / 60),
  }));

  const result = {
    totalDistance: route.distance,
    totalDuration: route.duration,
    totalDistanceKm: +(route.distance / 1000).toFixed(2),
    totalDurationMin: +Math.ceil(route.duration / 60),
    geometry: route.geometry,
    legs,
  };

  cacheService.set(cacheKey, result, 43200);
  return result;
}

/**
 * Get distance/duration matrix between all points using OSRM Table Service.
 */
export async function getDistanceMatrix(points, profile = 'driving') {
  if (points.length < 2) return null;

  const cacheKey = cacheService.generateKey(
    'matrix',
    points.map((p) => `${p.lat},${p.lng}`).join('|'),
    profile
  );
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${config.osrm.baseUrl}/table/v1/${profile}/${coords}?annotations=distance,duration`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM table failed: ${res.status}`);

  const data = await res.json();
  if (data.code !== 'Ok') {
    throw new Error(`OSRM table error: ${data.code}`);
  }

  const result = {
    durations: data.durations, // seconds NxN matrix
    distances: data.distances, // meters NxN matrix
  };

  cacheService.set(cacheKey, result, 43200);
  return result;
}

/**
 * Optimize waypoint order using OSRM Trip Service (TSP solver).
 */
export async function optimizeRoute(waypoints, profile = 'driving') {
  if (waypoints.length < 3) return waypoints;

  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
  const url = `${config.osrm.baseUrl}/trip/v1/${profile}/${coords}?roundtrip=false&source=first&destination=last&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM trip failed: ${res.status}`);

  const data = await res.json();
  if (data.code !== 'Ok' || !data.waypoints?.length) {
    logger.warn('OSRM trip optimization failed, returning original order');
    return waypoints;
  }

  // Reorder waypoints based on OSRM optimization
  const optimized = data.waypoints
    .sort((a, b) => a.waypoint_index - b.waypoint_index)
    .map((wp) => {
      const idx = data.waypoints.indexOf(wp);
      return waypoints[idx] || waypoints[wp.waypoint_index];
    });

  return optimized;
}

export default {
  getRoute,
  getMultiRoute,
  getDistanceMatrix,
  optimizeRoute,
};
