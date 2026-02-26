/**
 * Format minutes into a human-readable duration.
 */
export function formatDuration(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Format distance in km.
 */
export function formatDistance(km) {
  if (!km) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Format 24h time string to 12h.
 */
export function formatTime(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Get slot label.
 */
export function slotLabel(slot) {
  const labels = {
    morning: '🌅 Morning',
    midMorning: '☀️ Mid-Morning',
    lunch: '🍽️ Lunch',
    afternoon: '🌤️ Afternoon',
    evening: '🌅 Evening',
    dinner: '🍷 Dinner',
  };
  return labels[slot] || slot;
}

/**
 * Get activity type icon.
 */
export function typeIcon(type) {
  const icons = {
    attraction: '🏛️',
    restaurant: '🍽️',
    cafe: '☕',
    activity: '🎯',
    viewpoint: '🌄',
    market: '🛍️',
    temple: '🛕',
    museum: '🏛️',
    beach: '🏖️',
    park: '🌳',
  };
  return icons[type] || '📍';
}

/**
 * Get energy level details.
 */
export function energyInfo(level) {
  const info = {
    relaxed: { color: 'text-green-600', bg: 'bg-green-50', label: 'Relaxed', emoji: '🟢' },
    moderate: { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Moderate', emoji: '🟡' },
    high: { color: 'text-red-600', bg: 'bg-red-50', label: 'High Energy', emoji: '🔴' },
  };
  return info[level] || info.moderate;
}

/**
 * Generate a random pastel color for map markers.
 */
export function dayColor(dayIndex) {
  const colors = [
    '#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#06b6d4',
  ];
  return colors[dayIndex % colors.length];
}

/**
 * Truncate text.
 */
export function truncate(text, maxLen = 100) {
  if (!text || text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
}

/**
 * Convert and format currency amount.
 * @param {number} amount - The amount in original currency
 * @param {string} originalCurrency - The original currency code
 * @param {object|null} convertedCurrency - { code, rate } from store
 * @returns {string} Formatted amount e.g. "1,500 IDR (~$0.09 USD)"
 */
export function formatCurrency(amount, originalCurrency, convertedCurrency) {
  if (!amount) return '';
  const formatted = `${amount.toLocaleString()} ${originalCurrency || ''}`;
  if (!convertedCurrency || !convertedCurrency.rate || convertedCurrency.code === originalCurrency) {
    return formatted;
  }
  const converted = amount * convertedCurrency.rate;
  return `${formatted} (~${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${convertedCurrency.code})`;
}

/**
 * Format a date string (YYYY-MM-DD) to a friendly display.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
