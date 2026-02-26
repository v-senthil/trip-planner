/**
 * Generate a Google Maps search URL for an activity.
 * Uses the search-friendly format: /maps/search/{name}+{destination}
 * Falls back to coordinates or activity name only.
 */
export function googleMapsUrl(activity, destination) {
  const name = activity.name || '';
  if (name && destination) {
    const query = `${name}, ${destination}`.replace(/\s+/g, '+');
    return `https://www.google.com/maps/search/${encodeURIComponent(query).replace(/%2B/g, '+').replace(/%2C/g, ',')}`;
  }
  if (name) {
    return `https://www.google.com/maps/search/${encodeURIComponent(name).replace(/%20/g, '+')}`;
  }
  if (activity.coordinates) {
    return `https://www.google.com/maps/search/${activity.coordinates.lat},${activity.coordinates.lng}`;
  }
  return 'https://www.google.com/maps';
}

/**
 * Try to extract lat/lng from a Google Maps URL or plain coordinates.
 * Supports:
 *   https://www.google.com/maps/place/.../@15.4989,73.8278,...
 *   https://www.google.com/maps?q=15.4989,73.8278
 *   https://www.google.com/maps/search/?api=1&query=15.4989,73.8278
 *   plain "15.4989, 73.8278"
 */
export function extractCoordsFromUrl(input) {
  if (!input) return null;
  const s = input.trim();

  // Try plain "lat, lng" or "lat,lng"
  const plain = s.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (plain) {
    const lat = parseFloat(plain[1]);
    const lng = parseFloat(plain[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
  }

  // Try @lat,lng in URL
  const atMatch = s.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
  }

  // Try query=lat,lng
  const qMatch = s.match(/[?&](?:q|query)=(-?\d+\.?\d+)[,%20]+(-?\d+\.?\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
  }

  return null;
}
