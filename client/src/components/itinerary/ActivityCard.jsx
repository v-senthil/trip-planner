import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, MapPin, Clock, DollarSign, Trash2, ExternalLink, AlertTriangle, Search, Navigation, Pencil, Check, X } from 'lucide-react';
import useTripStore from '../../store/tripStore';
import { formatTime, formatDuration, typeIcon, energyInfo } from '../../utils/formatters';
import { googleMapsUrl, extractCoordsFromUrl } from '../../utils/mapsHelpers';
import Button from '../ui/Button';
import EnergyMeter from './EnergyMeter';

export default function ActivityCard({ activity, dayNumber, index, isEditing: dayEditing }) {
  const { swapAttraction, updateActivity, removeActivity, updateActivityCoordinates, reGeocodeActivity, isLoading, itinerary } = useTripStore();
  const destination = itinerary?.destination || '';
  const energy = energyInfo(activity.energyLevel);

  const [showLocationFix, setShowLocationFix] = useState(false);
  const [fixMode, setFixMode] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState('');

  // Per-activity inline edit state
  const [selfEditing, setSelfEditing] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [mapsLink, setMapsLink] = useState('');
  const [mapsLinkMsg, setMapsLinkMsg] = useState('');

  const isEditing = dayEditing || selfEditing;
  const isApproximate = activity.approximate === true;
  const isMissing = !activity.coordinates;

  const startEditing = () => {
    setEditFields({
      name: activity.name || '',
      description: activity.description || '',
      timeStart: activity.timeStart || '',
      type: activity.type || 'attraction',
    });
    setMapsLink('');
    setMapsLinkMsg('');
    setSelfEditing(true);
  };

  const cancelEditing = () => {
    setSelfEditing(false);
    setEditFields({});
    setMapsLink('');
    setMapsLinkMsg('');
  };

  const saveEditing = async () => {
    // Apply field changes
    updateActivity(dayNumber, index, {
      name: editFields.name,
      description: editFields.description,
      timeStart: editFields.timeStart,
      type: editFields.type,
    });

    // Apply coordinates from Google Maps link if provided
    if (mapsLink.trim()) {
      const coords = extractCoordsFromUrl(mapsLink);
      if (coords) {
        await updateActivityCoordinates(dayNumber, index, coords.lat, coords.lng);
      } else {
        // Try as a search query
        const result = await reGeocodeActivity(dayNumber, index, mapsLink.trim());
        if (!result.success) {
          setMapsLinkMsg('Could not find location. Try pasting a Google Maps URL with coordinates.');
          return; // Don't close — let user fix
        }
      }
    }

    setSelfEditing(false);
    setEditFields({});
    setMapsLink('');
    setMapsLinkMsg('');
  };

  const handleSearchFix = async () => {
    if (!searchQuery.trim()) return;
    setFixLoading(true);
    setFixError('');
    const result = await reGeocodeActivity(dayNumber, index, searchQuery.trim());
    setFixLoading(false);
    if (result.success) {
      setShowLocationFix(false);
      setSearchQuery('');
    } else {
      setFixError(result.message || 'Location not found');
    }
  };

  const handleManualFix = async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setFixError('Invalid coordinates. Lat: -90 to 90, Lng: -180 to 180');
      return;
    }
    setFixLoading(true);
    setFixError('');
    await updateActivityCoordinates(dayNumber, index, lat, lng);
    setFixLoading(false);
    setShowLocationFix(false);
    setManualLat('');
    setManualLng('');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative group"
    >
      {/* Travel info from previous */}
      {activity.travelFromPrevious?.minutes > 0 && (
        <div className="flex items-center gap-2 py-2 px-4 text-xs text-gray-400 dark:text-gray-600">
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
          <Clock className="w-3 h-3" />
          <span>
            {activity.travelFromPrevious.minutes} min
            {activity.travelFromPrevious.distanceKm
              ? ` · ${activity.travelFromPrevious.distanceKm} km`
              : ''}
            {activity.travelFromPrevious.method
              ? ` by ${activity.travelFromPrevious.method}`
              : ''}
          </span>
        </div>
      )}

        <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-md transition-all duration-200">
        {/* Time column */}
        <div className="shrink-0 w-20 text-center">
          {activity.timeStart && (
            <div className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {formatTime(activity.timeStart)}
            </div>
          )}
          {activity.timeEnd && (
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {formatTime(activity.timeEnd)}
            </div>
          )}
          {activity.estimatedMinutes && (
            <div className="text-xs text-gray-300 dark:text-gray-600 mt-1">
              {formatDuration(activity.estimatedMinutes)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Inline edit form */}
              {selfEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={editFields.type}
                      onChange={(e) => setEditFields({ ...editFields, type: e.target.value })}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary-300 outline-none"
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
                      type="text"
                      value={editFields.name}
                      onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                      placeholder="Place name"
                      className="flex-1 font-semibold text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-300 outline-none text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={editFields.timeStart}
                      onChange={(e) => setEditFields({ ...editFields, timeStart: e.target.value })}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-300 outline-none"
                    />
                    <input
                      type="text"
                      value={editFields.description}
                      onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-300 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={mapsLink}
                      onChange={(e) => { setMapsLink(e.target.value); setMapsLinkMsg(''); }}
                      placeholder="Google Maps link or coordinates (optional)"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-300 outline-none"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Paste a Google Maps URL, or "lat, lng" to set the exact location
                    </p>
                    {mapsLinkMsg && <p className="text-xs text-red-500 mt-0.5">{mapsLinkMsg}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEditing}
                      disabled={!editFields.name.trim()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" /> Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeIcon(activity.type)}</span>
                    {dayEditing ? (
                      <input
                        type="text"
                        value={activity.name}
                        onChange={(e) =>
                          updateActivity(dayNumber, index, { name: e.target.value })
                        }
                        className="font-semibold text-gray-900 dark:text-white border-b border-dashed border-gray-300 dark:border-gray-600 focus:border-primary-400 outline-none bg-transparent"
                      />
                    ) : (
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">{activity.name}</h4>
                    )}
                  </div>

                  {activity.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {activity.budgetEstimate && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <DollarSign className="w-3 h-3" />
                        {activity.budgetEstimate}
                      </span>
                    )}
                    {activity.coordinates && !isApproximate && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <MapPin className="w-3 h-3" />
                        Located
                      </span>
                    )}
                    {isApproximate && (
                      <button
                        onClick={() => setShowLocationFix(!showLocationFix)}
                        className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full cursor-pointer"
                        title="Location is approximate (city center). Click to fix."
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Approximate location
                      </button>
                    )}
                    {isMissing && (
                      <button
                        onClick={() => setShowLocationFix(!showLocationFix)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 bg-red-50 px-2 py-0.5 rounded-full cursor-pointer"
                        title="Location not found on map. Click to provide correct location."
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Not on map
                      </button>
                    )}
                    <a
                      href={googleMapsUrl(activity, destination)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Google Maps
                    </a>
                    {activity.slot && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        {activity.slot}
                      </span>
                    )}
                  </div>

                  {activity.tips && (
                    <p className="text-xs text-primary-600 dark:text-primary-400 mt-2 bg-primary-50 dark:bg-primary-950/30 rounded-lg px-3 py-1.5">
                      💡 {activity.tips}
                    </p>
                  )}

                  {/* Location fix panel */}
                  <AnimatePresence>
                    {showLocationFix && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {isMissing ? '📍 Set location' : '📍 Correct location'}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setFixMode('search'); setFixError(''); }}
                            className={`text-xs px-2 py-1 rounded ${fixMode === 'search' ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                          >
                            <Search className="w-3 h-3 inline mr-1" />Search
                          </button>
                          <button
                            onClick={() => { setFixMode('manual'); setFixError(''); }}
                            className={`text-xs px-2 py-1 rounded ${fixMode === 'manual' ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                          >
                            <Navigation className="w-3 h-3 inline mr-1" />Coordinates
                          </button>
                        </div>
                      </div>

                      {fixMode === 'search' && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchFix()}
                            placeholder="e.g. Basilica of Bom Jesus, Goa"
                            className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                          />
                          <button
                            onClick={handleSearchFix}
                            disabled={fixLoading || !searchQuery.trim()}
                            className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {fixLoading ? '...' : 'Find'}
                          </button>
                        </div>
                      )}

                      {fixMode === 'manual' && (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="any"
                            value={manualLat}
                            onChange={(e) => setManualLat(e.target.value)}
                            placeholder="Latitude"
                            className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                          />
                          <input
                            type="number"
                            step="any"
                            value={manualLng}
                            onChange={(e) => setManualLng(e.target.value)}
                            placeholder="Longitude"
                            className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                          />
                          <button
                            onClick={handleManualFix}
                            disabled={fixLoading || !manualLat || !manualLng}
                            className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {fixLoading ? '...' : 'Set'}
                          </button>
                        </div>
                      )}

                      {fixError && (
                        <p className="text-xs text-red-600">{fixError}</p>
                      )}

                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {fixMode === 'search'
                          ? 'Search for the place name or nearby landmark to find the correct location.'
                          : 'Tip: Right-click a location on Google Maps and copy the coordinates.'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-1 shrink-0">
              {!selfEditing && (
                <button
                  onClick={startEditing}
                  className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="Edit place"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => swapAttraction(dayNumber, index)}
                disabled={isLoading}
                className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 opacity-0 group-hover:opacity-100 transition-all"
                title="Swap with alternative"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeActivity(dayNumber, index)}
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                title="Remove place"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
