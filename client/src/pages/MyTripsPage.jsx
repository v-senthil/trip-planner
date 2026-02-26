import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Clock, Trash2, ChevronRight,
  Plane, Sun, Palmtree, Briefcase,
} from 'lucide-react';
import useTripStore from '../store/tripStore';

const moodIcons = {
  chill: '😎', party: '🎉', spiritual: '🙏', nature: '🌿', photography: '📸',
};

const budgetLabels = {
  low: '💰 Budget', medium: '💵 Moderate', luxury: '💎 Luxury',
};

export default function MyTripsPage() {
  const { savedTrips, fetchSavedTrips, loadTrip, deleteSavedTrip, isLoading } = useTripStore();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    fetchSavedTrips();
  }, []);

  const handleOpenTrip = async (tripId) => {
    setLoadingId(tripId);
    await loadTrip(tripId);
    setLoadingId(null);
    navigate('/itinerary');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch { return dateStr; }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(dateStr);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-gray-900 dark:text-white">
          My Itineraries
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-md mx-auto">
          All your planned trips in one place. Click to open and manage.
        </p>
      </motion.div>

      {savedTrips?.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-400 mb-2">No trips yet</h2>
          <p className="text-gray-400 mb-6">
            Start planning your first adventure!
          </p>
          <button
            onClick={() => navigate('/plan')}
            className="btn-primary px-6 py-3 inline-flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Plan a Trip
          </button>
        </motion.div>
      )}

      <div className="space-y-4">
        <AnimatePresence>
          {savedTrips?.map((trip, i) => (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: i * 0.05 }}
              className="card hover:shadow-card-hover transition-all duration-200 cursor-pointer group relative overflow-hidden"
              onClick={() => handleOpenTrip(trip.id)}
            >
              {/* Loading overlay */}
              {loadingId === trip.id && (
                <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              <div className="p-5 sm:p-6 flex items-center gap-4">
                {/* Destination icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-cyan-500 flex items-center justify-center text-white shadow-lg shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>

                {/* Trip info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white truncate">
                    {trip.destination}
                    {trip.country && (
                      <span className="text-gray-400 dark:text-gray-500 font-normal text-sm ml-2">{trip.country}</span>
                    )}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                    {trip.startDate && trip.endDate && (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
                      </span>
                    )}
                    {trip.daysCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Sun className="w-3.5 h-3.5" />
                        {trip.daysCount} day{trip.daysCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {trip.activitiesCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Palmtree className="w-3.5 h-3.5" />
                        {trip.activitiesCount} place{trip.activitiesCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {trip.budget && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {budgetLabels[trip.budget] || trip.budget}
                      </span>
                    )}
                    {trip.mood && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {moodIcons[trip.mood] || ''} {trip.mood}
                      </span>
                    )}
                    {trip.travelPace && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {trip.travelPace}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:block text-xs text-gray-400 dark:text-gray-500">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {getTimeAgo(trip.updatedAt)}
                  </span>

                  <button
                    className="p-2 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete trip"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete trip to ${trip.destination}?`)) {
                        deleteSavedTrip(trip.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
