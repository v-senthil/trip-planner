import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Hammer } from 'lucide-react';
import TripForm from '../components/forms/TripForm';
import ManualTripForm from '../components/forms/ManualTripForm';
import { LoadingOverlay } from '../components/ui/LoadingSkeleton';
import useTripStore from '../store/tripStore';

export default function PlannerPage() {
  const { isLoading, loadingMessage } = useTripStore();
  const [mode, setMode] = useState(null); // null | 'ai' | 'manual'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {isLoading && <LoadingOverlay message={loadingMessage} />}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-gray-900 dark:text-white">
          Plan Your Trip
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-md mx-auto">
          Choose how you'd like to plan your trip.
        </p>
      </motion.div>

      {/* Mode selector */}
      {!mode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          <button
            onClick={() => setMode('ai')}
            className="card p-8 text-center hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-display font-bold text-xl text-gray-900 dark:text-white mb-2">
              Plan with AI
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI generates a complete day-by-day itinerary with places, routes, budgets, and tips — tailored to your preferences.
            </p>
          </button>

          <button
            onClick={() => setMode('manual')}
            className="card p-8 text-center hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
              <Hammer className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-display font-bold text-xl text-gray-900 dark:text-white mb-2">
              Plan Manually
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Set your destination and dates — we'll provide weather, transport info, and packing tips. You build the itinerary yourself.
            </p>
          </button>
        </motion.div>
      )}

      {/* Back button + chosen mode */}
      {mode && (
        <div className="max-w-2xl mx-auto mb-6">
          <button
            onClick={() => setMode(null)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 inline-flex items-center gap-1 transition-colors"
          >
            ← Back to options
          </button>
        </div>
      )}

      {mode === 'ai' && <TripForm />}
      {mode === 'manual' && <ManualTripForm />}
    </div>
  );
}
