import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../logger.js';
import { encrypt, decrypt, maskKey } from './encryptionService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../data/tripplanner.db');

// Ensure the data directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id            TEXT PRIMARY KEY,
    destination   TEXT NOT NULL,
    country       TEXT,
    currency      TEXT,
    language      TEXT,
    start_date    TEXT,
    end_date      TEXT,
    budget        TEXT,
    travel_pace   TEXT,
    vacation_type TEXT,          -- JSON array
    food_preference TEXT,        -- JSON array
    transport_type TEXT,
    accommodation_area TEXT,
    mood          TEXT,
    best_time_to_visit TEXT,
    local_tips    TEXT,          -- JSON array
    emergency_numbers TEXT,      -- JSON object
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS days (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id         TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_number      INTEGER NOT NULL,
    date            TEXT,
    theme           TEXT,
    area            TEXT,
    energy_level    TEXT,
    estimated_budget TEXT,       -- JSON { amount, currency, breakdown }
    route           TEXT,        -- JSON route data
    UNIQUE(trip_id, day_number)
  );

  CREATE TABLE IF NOT EXISTS activities (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id              INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    name                TEXT NOT NULL,
    type                TEXT,
    time_start          TEXT,
    time_end            TEXT,
    estimated_minutes   INTEGER,
    description         TEXT,
    budget_estimate     TEXT,
    tips                TEXT,
    slot                TEXT,
    latitude            REAL,
    longitude           REAL,
    travel_from_previous TEXT, -- JSON { minutes, distanceKm, method }
    energy_level        TEXT,
    custom_added        INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS packing_lists (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id   TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    data      TEXT NOT NULL,  -- full JSON
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(trip_id)
  );

  CREATE TABLE IF NOT EXISTS transport_guides (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id   TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    data      TEXT NOT NULL,  -- full JSON
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(trip_id)
  );

  CREATE INDEX IF NOT EXISTS idx_days_trip ON days(trip_id);
  CREATE INDEX IF NOT EXISTS idx_activities_day ON activities(day_id);

  CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    name            TEXT PRIMARY KEY,          -- e.g. 'GEMINI_API_KEY'
    encrypted_value TEXT NOT NULL,             -- AES-256-GCM token stored as iv:tag:ct
    hint            TEXT NOT NULL DEFAULT '',  -- last-4 chars for display only
    updated_at      TEXT DEFAULT (datetime('now'))
  );
`);

logger.info(`📦 SQLite database ready at ${DB_PATH}`);

// ─── Trip CRUD ───────────────────────────────────────────────────────────────

const stmts = {
  insertTrip: db.prepare(`
    INSERT OR REPLACE INTO trips (id, destination, country, currency, language,
      start_date, end_date, budget, travel_pace, vacation_type,
      food_preference, transport_type, accommodation_area, mood,
      best_time_to_visit, local_tips, emergency_numbers, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `),

  insertDay: db.prepare(`
    INSERT OR REPLACE INTO days (trip_id, day_number, date, theme, area,
      energy_level, estimated_budget, route)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  insertActivity: db.prepare(`
    INSERT INTO activities (day_id, sort_order, name, type, time_start, time_end,
      estimated_minutes, description, budget_estimate, tips, slot,
      latitude, longitude, travel_from_previous, energy_level, custom_added)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getTrips: db.prepare(`SELECT * FROM trips ORDER BY updated_at DESC`),

  getTrip: db.prepare(`SELECT * FROM trips WHERE id = ?`),

  getDays: db.prepare(`SELECT * FROM days WHERE trip_id = ? ORDER BY day_number`),

  getActivities: db.prepare(`SELECT * FROM activities WHERE day_id = ? ORDER BY sort_order`),

  deleteTrip: db.prepare(`DELETE FROM trips WHERE id = ?`),

  deleteDay: db.prepare(`DELETE FROM days WHERE trip_id = ? AND day_number = ?`),

  clearDays: db.prepare(`DELETE FROM days WHERE trip_id = ?`),

  getDayByNumber: db.prepare(`SELECT * FROM days WHERE trip_id = ? AND day_number = ?`),

  deleteActivity: db.prepare(`DELETE FROM activities WHERE id = ?`),

  deleteActivitiesForDay: db.prepare(`DELETE FROM activities WHERE day_id = ?`),

  getActivity: db.prepare(`SELECT * FROM activities WHERE id = ?`),

  updateActivity: db.prepare(`
    UPDATE activities SET name=?, type=?, time_start=?, time_end=?,
      estimated_minutes=?, description=?, budget_estimate=?, tips=?, slot=?,
      latitude=?, longitude=?, travel_from_previous=?, energy_level=?, sort_order=?
    WHERE id = ?
  `),

  updateTrip: db.prepare(`UPDATE trips SET updated_at = datetime('now') WHERE id = ?`),

  upsertPackingList: db.prepare(`
    INSERT INTO packing_lists (trip_id, data) VALUES (?, ?)
    ON CONFLICT(trip_id) DO UPDATE SET data = excluded.data, created_at = datetime('now')
  `),

  getPackingList: db.prepare(`SELECT data FROM packing_lists WHERE trip_id = ?`),

  upsertTransportGuide: db.prepare(`
    INSERT INTO transport_guides (trip_id, data) VALUES (?, ?)
    ON CONFLICT(trip_id) DO UPDATE SET data = excluded.data, created_at = datetime('now')
  `),

  getTransportGuide: db.prepare(`SELECT data FROM transport_guides WHERE trip_id = ?`),

  getMaxDayNumber: db.prepare(`SELECT MAX(day_number) as maxDay FROM days WHERE trip_id = ?`),

  reorderDays: db.prepare(`UPDATE days SET day_number = ? WHERE trip_id = ? AND day_number = ?`),

  // Settings
  getAllSettings: db.prepare(`SELECT key, value FROM settings`),
  getSetting: db.prepare(`SELECT value FROM settings WHERE key = ?`),
  upsertSetting: db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `),

  // API keys (encrypted)
  getAllApiKeys: db.prepare(`SELECT name, hint, updated_at FROM api_keys ORDER BY name`),
  getApiKey:    db.prepare(`SELECT encrypted_value FROM api_keys WHERE name = ?`),
  upsertApiKey: db.prepare(`
    INSERT INTO api_keys (name, encrypted_value, hint, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(name) DO UPDATE
      SET encrypted_value = excluded.encrypted_value,
          hint            = excluded.hint,
          updated_at      = datetime('now')
  `),
  deleteApiKey: db.prepare(`DELETE FROM api_keys WHERE name = ?`),
};

// ─── High-level functions ────────────────────────────────────────────────────

/**
 * Save a complete trip (itinerary + form data) to DB.
 * Returns the trip id.
 */
function saveTrip(tripId, formData, itinerary) {
  const saveTripTx = db.transaction(() => {
    // 1. Upsert trip row
    stmts.insertTrip.run(
      tripId,
      itinerary.destination || formData.destination,
      itinerary.country || null,
      itinerary.currency || null,
      itinerary.language || null,
      itinerary.startDate || formData.startDate || null,
      itinerary.endDate || formData.endDate || null,
      formData.budget || null,
      formData.travelPace || null,
      JSON.stringify(formData.vacationType || []),
      JSON.stringify(formData.foodPreference || []),
      formData.transportType || null,
      formData.accommodationArea || null,
      formData.mood ? (Array.isArray(formData.mood) ? formData.mood.join(', ') : formData.mood) : null,
      itinerary.bestTimeToVisit || null,
      JSON.stringify(itinerary.localTips || []),
      JSON.stringify(itinerary.emergencyNumbers || {}),
    );

    // 2. Clear existing days & activities for this trip (cascade)
    stmts.clearDays.run(tripId);

    // 3. Insert days + activities
    if (itinerary.days) {
      for (const day of itinerary.days) {
        const dayResult = stmts.insertDay.run(
          tripId,
          day.day,
          day.date || null,
          day.theme || null,
          day.area || null,
          day.energyLevel || null,
          JSON.stringify(day.estimatedBudget || {}),
          JSON.stringify(day.route || null),
        );
        const dayId = dayResult.lastInsertRowid;

        if (day.activities) {
          day.activities.forEach((act, idx) => {
            stmts.insertActivity.run(
              dayId,
              idx,
              act.name,
              act.type || null,
              act.timeStart || null,
              act.timeEnd || null,
              act.estimatedMinutes || null,
              act.description || null,
              act.budgetEstimate || null,
              act.tips || null,
              act.slot || null,
              act.coordinates?.lat || null,
              act.coordinates?.lng || null,
              JSON.stringify(act.travelFromPrevious || null),
              act.energyLevel || null,
              act.customAdded ? 1 : 0,
            );
          });
        }
      }
    }

    return tripId;
  });

  return saveTripTx();
}

/**
 * Load a full trip from DB → itinerary object.
 */
function loadTrip(tripId) {
  const trip = stmts.getTrip.get(tripId);
  if (!trip) return null;

  const days = stmts.getDays.all(tripId).map((day) => {
    const activities = stmts.getActivities.all(day.id).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      timeStart: a.time_start,
      timeEnd: a.time_end,
      estimatedMinutes: a.estimated_minutes,
      description: a.description,
      budgetEstimate: a.budget_estimate,
      tips: a.tips,
      slot: a.slot,
      coordinates: a.latitude != null ? { lat: a.latitude, lng: a.longitude } : null,
      travelFromPrevious: safeParse(a.travel_from_previous),
      energyLevel: a.energy_level,
      customAdded: !!a.custom_added,
    }));

    return {
      day: day.day_number,
      date: day.date,
      theme: day.theme,
      area: day.area,
      energyLevel: day.energy_level,
      estimatedBudget: safeParse(day.estimated_budget),
      route: safeParse(day.route),
      activities,
    };
  });

  return {
    id: trip.id,
    destination: trip.destination,
    country: trip.country,
    currency: trip.currency,
    language: trip.language,
    startDate: trip.start_date,
    endDate: trip.end_date,
    bestTimeToVisit: trip.best_time_to_visit,
    localTips: safeParse(trip.local_tips) || [],
    emergencyNumbers: safeParse(trip.emergency_numbers) || {},
    days,
    formData: {
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      budget: trip.budget,
      travelPace: trip.travel_pace,
      vacationType: safeParse(trip.vacation_type) || [],
      foodPreference: safeParse(trip.food_preference) || [],
      transportType: trip.transport_type,
      accommodationArea: trip.accommodation_area,
      mood: trip.mood,
    },
  };
}

/**
 * List all saved trips (summary only).
 */
function listTrips() {
  return stmts.getTrips.all().map((t) => {
    const days = stmts.getDays.all(t.id);
    let totalActivities = 0;
    for (const d of days) {
      totalActivities += stmts.getActivities.all(d.id).length;
    }
    return {
      id: t.id,
      destination: t.destination,
      country: t.country,
      currency: t.currency,
      startDate: t.start_date,
      endDate: t.end_date,
      budget: t.budget,
      travelPace: t.travel_pace,
      mood: t.mood,
      daysCount: days.length,
      activitiesCount: totalActivities,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  });
}

/**
 * Delete a trip and all associated data.
 */
function deleteTrip(tripId) {
  stmts.deleteTrip.run(tripId);
}

/**
 * Add a new activity to a day.
 * If insertAtIndex is provided, shift existing activities to make room.
 */
function addActivity(tripId, dayNumber, activity, insertAtIndex) {
  const day = stmts.getDayByNumber.get(tripId, dayNumber);
  if (!day) throw new Error(`Day ${dayNumber} not found for trip ${tripId}`);

  const activities = stmts.getActivities.all(day.id);
  let sortOrder;

  if (insertAtIndex != null && insertAtIndex >= 0 && insertAtIndex < activities.length) {
    // Shift sort_order of activities at or after the insertion point
    sortOrder = insertAtIndex;
    db.prepare(
      `UPDATE activities SET sort_order = sort_order + 1 WHERE day_id = ? AND sort_order >= ?`
    ).run(day.id, sortOrder);
  } else {
    // Append at end
    const maxOrder = activities.length > 0 ? Math.max(...activities.map((a) => a.sort_order)) : -1;
    sortOrder = maxOrder + 1;
  }

  const result = stmts.insertActivity.run(
    day.id,
    sortOrder,
    activity.name,
    activity.type || 'attraction',
    activity.timeStart || null,
    activity.timeEnd || null,
    activity.estimatedMinutes || 60,
    activity.description || null,
    activity.budgetEstimate || null,
    activity.tips || null,
    activity.slot || null,
    activity.coordinates?.lat || null,
    activity.coordinates?.lng || null,
    JSON.stringify(activity.travelFromPrevious || null),
    activity.energyLevel || null,
    1, // custom_added = true
  );

  stmts.updateTrip.run(tripId);

  return { id: result.lastInsertRowid, ...activity, customAdded: true };
}

/**
 * Remove an activity by id.
 */
function removeActivity(tripId, activityId) {
  const activity = stmts.getActivity.get(activityId);
  if (!activity) throw new Error(`Activity ${activityId} not found`);
  stmts.deleteActivity.run(activityId);
  stmts.updateTrip.run(tripId);
  return true;
}

/**
 * Update an activity's coordinates (manual correction).
 */
function updateActivityCoordinates(tripId, activityId, lat, lng) {
  const activity = stmts.getActivity.get(activityId);
  if (!activity) throw new Error(`Activity ${activityId} not found`);
  db.prepare('UPDATE activities SET latitude = ?, longitude = ? WHERE id = ?').run(lat, lng, activityId);
  stmts.updateTrip.run(tripId);
  return true;
}

/**
 * Update an activity's fields (name, description, etc.).
 */
function updateActivity(tripId, activityId, fields) {
  const activity = stmts.getActivity.get(activityId);
  if (!activity) throw new Error(`Activity ${activityId} not found`);

  stmts.updateActivity.run(
    fields.name ?? activity.name,
    fields.type ?? activity.type,
    fields.timeStart ?? activity.time_start,
    fields.timeEnd ?? activity.time_end,
    fields.estimatedMinutes ?? activity.estimated_minutes,
    fields.description ?? activity.description,
    fields.budgetEstimate ?? activity.budget_estimate,
    fields.tips ?? activity.tips,
    fields.slot ?? activity.slot,
    fields.lat ?? activity.latitude,
    fields.lng ?? activity.longitude,
    fields.travelFromPrevious !== undefined
      ? JSON.stringify(fields.travelFromPrevious)
      : activity.travel_from_previous,
    fields.energyLevel ?? activity.energy_level,
    fields.sortOrder ?? activity.sort_order,
    activityId,
  );

  stmts.updateTrip.run(tripId);
  return true;
}

/**
 * Add a new empty day at the end.
 */
function addDay(tripId, date) {
  const maxRow = stmts.getMaxDayNumber.get(tripId);
  const newDayNumber = (maxRow?.maxDay || 0) + 1;

  const result = stmts.insertDay.run(
    tripId,
    newDayNumber,
    date || null,
    `Day ${newDayNumber}`,
    null,
    'moderate',
    JSON.stringify({ amount: 0, currency: '', breakdown: {} }),
    null,
  );

  stmts.updateTrip.run(tripId);

  return {
    dayId: result.lastInsertRowid,
    day: newDayNumber,
    date,
    theme: `Day ${newDayNumber}`,
    area: null,
    energyLevel: 'moderate',
    estimatedBudget: { amount: 0, currency: '', breakdown: {} },
    route: null,
    activities: [],
  };
}

/**
 * Remove a day and reorder subsequent days.
 */
function removeDay(tripId, dayNumber) {
  const removeDayTx = db.transaction(() => {
    stmts.deleteDay.run(tripId, dayNumber);
    // Reorder: shift all higher day numbers down by 1
    const remaining = stmts.getDays.all(tripId);
    remaining.forEach((d, idx) => {
      const newNum = idx + 1;
      if (d.day_number !== newNum) {
        db.prepare(`UPDATE days SET day_number = ? WHERE id = ?`).run(newNum, d.id);
      }
    });
    stmts.updateTrip.run(tripId);
  });
  removeDayTx();
  return true;
}

/**
 * Save packing list for a trip.
 */
function savePackingList(tripId, data) {
  stmts.upsertPackingList.run(tripId, JSON.stringify(data));
}

/**
 * Get packing list for a trip.
 */
function getPackingList(tripId) {
  const row = stmts.getPackingList.get(tripId);
  return row ? safeParse(row.data) : null;
}

/**
 * Save transport guide for a trip.
 */
function saveTransportGuide(tripId, data) {
  stmts.upsertTransportGuide.run(tripId, JSON.stringify(data));
}

/**
 * Get transport guide for a trip.
 */
function getTransportGuide(tripId) {
  const row = stmts.getTransportGuide.get(tripId);
  return row ? safeParse(row.data) : null;
}

// ─── Settings ────────────────────────────────────────────────────────────────

function getSettings() {
  const rows = stmts.getAllSettings.all();
  const settings = {};
  for (const row of rows) {
    try { settings[row.key] = JSON.parse(row.value); }
    catch { settings[row.key] = row.value; }
  }
  return settings;
}

function saveSetting(key, value) {
  const val = typeof value === 'string' ? value : JSON.stringify(value);
  stmts.upsertSetting.run(key, val);
}

const saveSettingsBatch = db.transaction((settings) => {
  for (const [key, value] of Object.entries(settings)) {
    const val = typeof value === 'string' ? value : JSON.stringify(value);
    stmts.upsertSetting.run(key, val);
  }
});

function saveSettings(settings) {
  saveSettingsBatch(settings);
}

// ─── API key storage (encrypted) ─────────────────────────────────────────────

/**
 * Save (or update) an API key, encrypting it before storage.
 * @param {string} name       e.g. 'GEMINI_API_KEY'
 * @param {string} plainValue the actual key string
 */
function saveApiKey(name, plainValue) {
  const encryptedValue = encrypt(plainValue);
  const hint = maskKey(plainValue);
  stmts.upsertApiKey.run(name, encryptedValue, hint);
}

/**
 * Retrieve and decrypt an API key.
 * Returns null if the key has not been stored.
 * @param {string} name
 * @returns {string|null}
 */
function getApiKey(name) {
  const row = stmts.getApiKey.get(name);
  if (!row) return null;
  try {
    return decrypt(row.encrypted_value);
  } catch (err) {
    logger.error(`Failed to decrypt API key "${name}": ${err.message}`);
    return null;
  }
}

/**
 * List all stored API key entries (names + hints only — no decrypted values).
 * @returns {{ name: string, hint: string, updatedAt: string }[]}
 */
function listApiKeys() {
  return stmts.getAllApiKeys.all().map((r) => ({
    name: r.name,
    hint: r.hint,
    updatedAt: r.updated_at,
  }));
}

/**
 * Delete a stored API key entry.
 * @param {string} name
 */
function deleteApiKey(name) {
  stmts.deleteApiKey.run(name);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeParse(json) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default {
  saveTrip,
  loadTrip,
  listTrips,
  deleteTrip,
  addActivity,
  removeActivity,
  updateActivity,
  updateActivityCoordinates,
  addDay,
  removeDay,
  savePackingList,
  getPackingList,
  saveTransportGuide,
  getTransportGuide,
  getSettings,
  saveSetting,
  saveSettings,
  // encrypted API keys
  saveApiKey,
  getApiKey,
  listApiKeys,
  deleteApiKey,
};
