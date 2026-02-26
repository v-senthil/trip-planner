import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useTripStore from '../store/tripStore';
import ItineraryView from '../components/itinerary/ItineraryView';
import { SkeletonItinerary } from '../components/ui/LoadingSkeleton';

export default function ItineraryPage() {
  const { itinerary, isLoading } = useTripStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!itinerary && !isLoading) {
      // No itinerary, redirect to planner
      navigate('/plan');
    }
  }, [itinerary, isLoading, navigate]);

  if (!itinerary && !isLoading) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {isLoading && !itinerary ? (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="inline-block">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-primary-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
                </div>
                <h2 className="font-display font-bold text-xl text-gray-900 dark:text-white">
                  Crafting Your Perfect Trip...
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Our AI is planning your day-by-day itinerary
                </p>
              </div>
            </div>
            <SkeletonItinerary />
          </div>
        ) : (
          <ItineraryView />
        )}
      </motion.div>
    </div>
  );
}
