import logger from '../logger.js';

/**
 * Simple K-means clustering for geographic coordinates.
 * Groups places into K clusters based on lat/lng proximity.
 */
export function kMeansCluster(points, k) {
  if (points.length <= k) {
    return points.map((p, i) => ({ ...p, cluster: i }));
  }

  // Initialize centroids using k-means++ strategy
  const centroids = initializeCentroids(points, k);
  let assignments = new Array(points.length).fill(-1);
  let maxIterations = 100;
  let changed = true;

  while (changed && maxIterations > 0) {
    changed = false;
    maxIterations--;

    // Assign each point to nearest centroid
    for (let i = 0; i < points.length; i++) {
      let minDist = Infinity;
      let closest = 0;
      for (let j = 0; j < centroids.length; j++) {
        const dist = haversineDistance(
          points[i].lat, points[i].lng,
          centroids[j].lat, centroids[j].lng
        );
        if (dist < minDist) {
          minDist = dist;
          closest = j;
        }
      }
      if (assignments[i] !== closest) {
        assignments[i] = closest;
        changed = true;
      }
    }

    // Update centroids
    for (let j = 0; j < centroids.length; j++) {
      const members = points.filter((_, i) => assignments[i] === j);
      if (members.length > 0) {
        centroids[j] = {
          lat: members.reduce((s, p) => s + p.lat, 0) / members.length,
          lng: members.reduce((s, p) => s + p.lng, 0) / members.length,
        };
      }
    }
  }

  return points.map((p, i) => ({ ...p, cluster: assignments[i] }));
}

/**
 * K-means++ centroid initialization for better convergence.
 */
function initializeCentroids(points, k) {
  const centroids = [];
  const randomIdx = Math.floor(Math.random() * points.length);
  centroids.push({ lat: points[randomIdx].lat, lng: points[randomIdx].lng });

  for (let i = 1; i < k; i++) {
    const distances = points.map((p) => {
      const minDist = Math.min(
        ...centroids.map((c) => haversineDistance(p.lat, p.lng, c.lat, c.lng))
      );
      return minDist * minDist;
    });

    const totalDist = distances.reduce((s, d) => s + d, 0);
    let random = Math.random() * totalDist;
    let idx = 0;
    while (random > 0 && idx < distances.length) {
      random -= distances[idx];
      idx++;
    }
    idx = Math.max(0, idx - 1);
    centroids.push({ lat: points[idx].lat, lng: points[idx].lng });
  }

  return centroids;
}

/**
 * Haversine distance between two lat/lng points in km.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Group places into day-clusters optimized for geographic proximity.
 * Uses K-means with the number of trip days as K.
 */
export function groupByDays(places, numDays) {
  if (places.length === 0) return [];

  const validPlaces = places.filter((p) => p.lat != null && p.lng != null);
  if (validPlaces.length === 0) return [];

  const k = Math.min(numDays, validPlaces.length);
  const clustered = kMeansCluster(validPlaces, k);

  // Group into day arrays
  const groups = {};
  for (const place of clustered) {
    if (!groups[place.cluster]) groups[place.cluster] = [];
    groups[place.cluster].push(place);
  }

  return Object.values(groups);
}

/**
 * Nearest-neighbor ordering within a cluster for shortest path.
 */
export function orderByProximity(places) {
  if (places.length <= 2) return places;

  const ordered = [places[0]];
  const remaining = [...places.slice(1)];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(last.lat, last.lng, remaining[i].lat, remaining[i].lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    ordered.push(remaining[nearestIdx]);
    remaining.splice(nearestIdx, 1);
  }

  return ordered;
}

/**
 * Calculate energy level for a day based on number of activities and travel time.
 */
export function calculateEnergyLevel(activities, totalTravelMinutes) {
  const count = activities.length;
  const totalActivityMinutes = activities.reduce((s, a) => s + (a.estimatedMinutes || 60), 0);
  const totalMinutes = totalActivityMinutes + totalTravelMinutes;

  if (count >= 6 || totalMinutes > 600) return 'high';
  if (count >= 4 || totalMinutes > 420) return 'moderate';
  return 'relaxed';
}

export default {
  kMeansCluster,
  haversineDistance,
  groupByDays,
  orderByProximity,
  calculateEnergyLevel,
};
