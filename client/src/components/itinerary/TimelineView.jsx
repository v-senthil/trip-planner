import { motion } from 'framer-motion';
import { ExternalLink, AlertTriangle, Trash2, Shuffle } from 'lucide-react';
import useTripStore from '../../store/tripStore';
import { formatTime, formatDuration, typeIcon, dayColor, formatDate } from '../../utils/formatters';
import { googleMapsUrl } from '../../utils/mapsHelpers';

export default function TimelineView({ day, dayIndex }) {
  const color = dayColor(dayIndex);
  const { removeActivity, swapAttraction, isLoading, itinerary } = useTripStore();
  const destination = itinerary?.destination || '';

  return (
    <div className="relative pl-8">
      {/* Timeline line */}
      <div
        className="absolute left-3 top-0 bottom-0 w-0.5"
        style={{ backgroundColor: `${color}30` }}
      />

      {day.activities?.map((activity, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="relative pb-6 last:pb-0 group"
        >
          {/* Timeline dot */}
          <div
            className="absolute -left-5 w-4 h-4 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: color }}
          />

          {/* Travel info */}
          {activity.travelFromPrevious?.minutes > 0 && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1">
              <span className="w-4 h-px bg-gray-200 dark:bg-gray-700" />
              🚗 {activity.travelFromPrevious.minutes} min
              {activity.travelFromPrevious.distanceKm
                ? ` · ${activity.travelFromPrevious.distanceKm} km`
                : ''}
            </div>
          )}

          {/* Activity content */}
          <div className="bg-white dark:bg-gray-800/70 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="shrink-0 text-center">
                <span className="text-xl">{typeIcon(activity.type)}</span>
                {activity.timeStart && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {formatTime(activity.timeStart)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white">{activity.name}</h4>
                {activity.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{activity.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {activity.estimatedMinutes && (
                    <span className="text-xs bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded text-gray-500 dark:text-gray-400">
                      ⏱️ {formatDuration(activity.estimatedMinutes)}
                    </span>
                  )}
                  {activity.budgetEstimate && (
                    <span className="text-xs bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded text-gray-500 dark:text-gray-400">
                      💰 {activity.budgetEstimate}
                    </span>
                  )}
                  <a
                    href={googleMapsUrl(activity, destination)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-1 rounded"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Google Maps
                  </a>
                  {activity.approximate && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      <AlertTriangle className="w-3 h-3" />
                      Approximate
                    </span>
                  )}
                  {!activity.coordinates && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                      <AlertTriangle className="w-3 h-3" />
                      Not on map
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => swapAttraction(day.day, i)}
                  disabled={isLoading}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title="Swap with alternative"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeActivity(day.day, i)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Remove place"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
