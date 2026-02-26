import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Route, Edit3, Check, ChevronDown, ChevronUp, Plus, Trash2, CalendarPlus, X } from 'lucide-react';
import useTripStore from '../../store/tripStore';
import { energyInfo, dayColor, formatDate, formatCurrency } from '../../utils/formatters';
import { extractCoordsFromUrl } from '../../utils/mapsHelpers';
import ActivityCard from './ActivityCard';
import EnergyMeter from './EnergyMeter';
import Button from '../ui/Button';

export default function DayCard({ day, index }) {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [insertFormAt, setInsertFormAt] = useState(null); // index to insert before
  const [insertPlace, setInsertPlace] = useState({ name: '', type: 'attraction', timeStart: '', description: '', mapsLink: '' });
  const [insertLoading, setInsertLoading] = useState(false);
  const [newPlace, setNewPlace] = useState({ name: '', type: 'attraction', timeStart: '', description: '', mapsLink: '' });
  const { regenerateDay, optimizeRoute, isLoading, convertedCurrency, addActivity, removeDay, addDay, itinerary, updateActivityCoordinates } = useTripStore();
  const energy = energyInfo(day.energyLevel);
  const color = dayColor(index);

  const handleInlineInsert = async (position) => {
    if (!insertPlace.name.trim()) return;
    setInsertLoading(true);
    try {
      const activityData = {
        name: insertPlace.name.trim(),
        type: insertPlace.type,
        timeStart: insertPlace.timeStart || null,
        description: insertPlace.description || '',
      };
      const success = await addActivity(day.day, activityData, position);
      if (success && insertPlace.mapsLink.trim()) {
        const coords = extractCoordsFromUrl(insertPlace.mapsLink);
        if (coords) {
          await updateActivityCoordinates(day.day, position, coords.lat, coords.lng);
        }
      }
      setInsertFormAt(null);
      setInsertPlace({ name: '', type: 'attraction', timeStart: '', description: '', mapsLink: '' });
    } finally {
      setInsertLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="card overflow-hidden"
    >
      {/* Day header */}
      <div
        className="p-6 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white font-bold shadow-lg"
              style={{ backgroundColor: color }}
            >
              <span className="text-xs opacity-80">DAY</span>
              <span className="text-xl leading-none">{day.day}</span>
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white">
                {day.theme || `Day ${day.day}`}
              </h3>
              {day.date && (
                <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(day.date)}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                {day.area && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">📍 {day.area}</span>
                )}
                <EnergyMeter level={day.energyLevel} compact />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {day.estimatedBudget && (
              <span className="hidden sm:inline-flex text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">
                💰 {formatCurrency(day.estimatedBudget.amount, day.estimatedBudget.currency, convertedCurrency)}
              </span>
            )}
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Activities */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-6 pb-6"
        >
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={(e) => {
                e.stopPropagation();
                regenerateDay(day.day);
              }}
              loading={isLoading}
            >
              Regenerate Day
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={Route}
              onClick={(e) => {
                e.stopPropagation();
                optimizeRoute(day.day);
              }}
            >
              Optimize Route
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={isEditing ? Check : Edit3}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? 'Done Editing' : 'Edit'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={(e) => {
                e.stopPropagation();
                setShowAddPlace(!showAddPlace);
              }}
            >
              Add Place
            </Button>
            {itinerary?.days?.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Remove Day ${day.day}? This cannot be undone.`)) {
                    removeDay(day.day);
                  }
                }}
                className="text-red-500 hover:text-red-700"
              >
                Remove Day
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={CalendarPlus}
              onClick={(e) => {
                e.stopPropagation();
                addDay();
              }}
            >
              Add Day
            </Button>
          </div>

          {/* Add place form */}
          {showAddPlace && (
            <div className="mb-4 p-4 bg-primary-50 dark:bg-primary-950/30 rounded-xl border border-primary-100 dark:border-primary-900">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Add a new place</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Place name *"
                  value={newPlace.name}
                  onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
                  className="input text-sm"
                />
                <select
                  value={newPlace.type}
                  onChange={(e) => setNewPlace({ ...newPlace, type: e.target.value })}
                  className="input text-sm"
                >
                  <option value="attraction">🏛️ Attraction</option>
                  <option value="restaurant">🍽️ Restaurant</option>
                  <option value="cafe">☕ Cafe</option>
                  <option value="activity">🎯 Activity</option>
                  <option value="viewpoint">🌄 Viewpoint</option>
                  <option value="market">🛍️ Market</option>
                  <option value="temple">🛕 Temple</option>
                  <option value="museum">🏛️ Museum</option>
                  <option value="beach">🏖️ Beach</option>
                  <option value="park">🌳 Park</option>
                </select>
                <input
                  type="time"
                  placeholder="Start time"
                  value={newPlace.timeStart}
                  onChange={(e) => setNewPlace({ ...newPlace, timeStart: e.target.value })}
                  className="input text-sm"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newPlace.description}
                  onChange={(e) => setNewPlace({ ...newPlace, description: e.target.value })}
                  className="input text-sm"
                />
                <input
                  type="text"
                  placeholder="Google Maps link or lat,lng (optional)"
                  value={newPlace.mapsLink}
                  onChange={(e) => setNewPlace({ ...newPlace, mapsLink: e.target.value })}
                  className="input text-sm sm:col-span-2"
                />
              </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Paste a Google Maps URL or coordinates (e.g. "15.4989, 73.8278") to pin the exact location on the map.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  icon={Plus}
                  disabled={!newPlace.name.trim()}
                  onClick={async () => {
                    const activityData = {
                      name: newPlace.name.trim(),
                      type: newPlace.type,
                      timeStart: newPlace.timeStart || null,
                      description: newPlace.description || '',
                    };

                    await addActivity(day.day, activityData);

                    // If a Google Maps link was provided, extract and apply coordinates
                    if (newPlace.mapsLink.trim()) {
                      const coords = extractCoordsFromUrl(newPlace.mapsLink);
                      if (coords) {
                        // Find the newly added activity (last one in the day)
                        const currentDay = itinerary.days.find((d) => d.day === day.day);
                        const lastIdx = (currentDay?.activities?.length || 1) - 1;
                        await updateActivityCoordinates(day.day, lastIdx, coords.lat, coords.lng);
                      }
                    }

                    setNewPlace({ name: '', type: 'attraction', timeStart: '', description: '', mapsLink: '' });
                    setShowAddPlace(false);
                  }}
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddPlace(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Budget breakdown */}
          {day.estimatedBudget?.breakdown && (
            <div className="flex flex-wrap gap-4 mb-4 text-xs">
              {Object.entries(day.estimatedBudget.breakdown).map(([key, val]) => (
                <span key={key} className="bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300">
                  {key}: <strong>{formatCurrency(val, day.estimatedBudget.currency, convertedCurrency)}</strong>
                </span>
              ))}
            </div>
          )}

          {/* Activity list with insert-between buttons */}
          <div className="space-y-0">
            {/* Insert button before first activity */}
            <InsertButton
              position={0}
              isOpen={insertFormAt === 0}
              onToggle={() => {
                setInsertFormAt(insertFormAt === 0 ? null : 0);
                setInsertPlace({ name: '', type: 'attraction', timeStart: '', description: '', mapsLink: '' });
              }}
            />
            <AnimatePresence>
              {insertFormAt === 0 && (
                <InlineInsertForm
                  insertPlace={insertPlace}
                  setInsertPlace={setInsertPlace}
                  loading={insertLoading}
                  onSubmit={() => handleInlineInsert(0)}
                  onCancel={() => setInsertFormAt(null)}
                />
              )}
            </AnimatePresence>

            {day.activities?.map((activity, actIdx) => (
              <div key={activity.id || actIdx}>
                <ActivityCard
                  activity={activity}
                  dayNumber={day.day}
                  index={actIdx}
                  isEditing={isEditing}
                />
                {/* Insert button after each activity */}
                <InsertButton
                  position={actIdx + 1}
                  isOpen={insertFormAt === actIdx + 1}
                  onToggle={() => {
                    setInsertFormAt(insertFormAt === actIdx + 1 ? null : actIdx + 1);
                    setInsertPlace({ name: '', type: 'attraction', timeStart: '', description: '', mapsLink: '' });
                  }}
                />
                <AnimatePresence>
                  {insertFormAt === actIdx + 1 && (
                    <InlineInsertForm
                      insertPlace={insertPlace}
                      setInsertPlace={setInsertPlace}
                      loading={insertLoading}
                      onSubmit={() => handleInlineInsert(actIdx + 1)}
                      onCancel={() => setInsertFormAt(null)}
                    />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Day route summary */}
          {day.route && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>🚗 Total: {day.route.totalDistanceKm} km</span>
              <span>⏱️ Travel time: {day.route.totalDurationMin} min</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── Insert (+) Button ──────────────────────────────────────── */
function InsertButton({ position, isOpen, onToggle }) {
  return (
    <div className="group flex items-center gap-2 py-1">
      <div className="flex-1 border-t border-dashed border-transparent group-hover:border-primary-300 transition-colors" />
      <button
        onClick={onToggle}
        className={`
          flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-200
          ${isOpen
            ? 'bg-primary-500 border-primary-500 text-white rotate-45 scale-110'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 opacity-0 group-hover:opacity-100 hover:border-primary-400 hover:text-primary-500 hover:scale-110'
          }
        `}
        title={isOpen ? 'Cancel' : 'Insert place here'}
      >
        <Plus className="w-4 h-4" />
      </button>
      <div className="flex-1 border-t border-dashed border-transparent group-hover:border-primary-300 transition-colors" />
    </div>
  );
}

/* ─── Inline Insert Form ─────────────────────────────────────── */
function InlineInsertForm({ insertPlace, setInsertPlace, loading, onSubmit, onCancel }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mx-2 my-1 p-3 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-950/40 dark:to-blue-950/30 rounded-xl border border-primary-200 dark:border-primary-800 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="w-4 h-4 text-primary-500" />
          <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">Insert a place</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          <input
            autoFocus
            type="text"
            placeholder="Place name *"
            value={insertPlace.name}
            onChange={(e) => setInsertPlace({ ...insertPlace, name: e.target.value })}
            className="input text-sm"
            onKeyDown={(e) => e.key === 'Enter' && insertPlace.name.trim() && onSubmit()}
          />
          <select
            value={insertPlace.type}
            onChange={(e) => setInsertPlace({ ...insertPlace, type: e.target.value })}
            className="input text-sm"
          >
            <option value="attraction">🏛️ Attraction</option>
            <option value="restaurant">🍽️ Restaurant</option>
            <option value="cafe">☕ Cafe</option>
            <option value="activity">🎯 Activity</option>
            <option value="viewpoint">🌄 Viewpoint</option>
            <option value="market">🛍️ Market</option>
            <option value="temple">🛕 Temple</option>
            <option value="museum">🏛️ Museum</option>
            <option value="beach">🏖️ Beach</option>
            <option value="park">🌳 Park</option>
          </select>
          <input
            type="time"
            placeholder="Time"
            value={insertPlace.timeStart}
            onChange={(e) => setInsertPlace({ ...insertPlace, timeStart: e.target.value })}
            className="input text-sm"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            placeholder="Description (optional)"
            value={insertPlace.description}
            onChange={(e) => setInsertPlace({ ...insertPlace, description: e.target.value })}
            className="input text-sm"
          />
          <input
            type="text"
            placeholder="Google Maps link or lat,lng (optional)"
            value={insertPlace.mapsLink}
            onChange={(e) => setInsertPlace({ ...insertPlace, mapsLink: e.target.value })}
            className="input text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!insertPlace.name.trim() || loading}
            onClick={onSubmit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Add
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}
