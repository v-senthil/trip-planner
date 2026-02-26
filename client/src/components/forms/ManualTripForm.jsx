import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, CalendarDays, ArrowRight, Hammer } from 'lucide-react';
import useTripStore from '../../store/tripStore';
import DestinationInput from './DestinationInput';
import Button from '../ui/Button';

export default function ManualTripForm() {
  const navigate = useNavigate();
  const { formData, updateFormData, createManualTrip, isLoading, loadingMessage, error, clearError } = useTripStore();
  const [submitted, setSubmitted] = useState(false);

  const canSubmit =
    formData.destination?.length >= 2 &&
    formData.startDate &&
    formData.endDate &&
    new Date(formData.endDate) >= new Date(formData.startDate);

  const dayCount = (() => {
    if (!formData.startDate || !formData.endDate) return 0;
    const s = new Date(formData.startDate);
    const e = new Date(formData.endDate);
    return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
  })();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitted(true);
      await createManualTrip();
      navigate('/itinerary');
    } catch {
      setSubmitted(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Hammer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-gray-900 dark:text-white">Manual Trip</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Set your destination and dates — you'll build the itinerary.
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
            <p className="text-red-700 text-sm">{error}</p>
            <button onClick={clearError} className="text-red-500 hover:text-red-700 text-sm font-medium">
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="inline w-4 h-4 mr-1.5" />
              Destination
            </label>
            <DestinationInput
              value={formData.destination}
              onChange={(val) => updateFormData({ destination: val })}
            />
          </div>

          {/* Date pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CalendarDays className="inline w-4 h-4 mr-1.5" />
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  updateFormData({ startDate: e.target.value });
                  if (!formData.endDate || e.target.value > formData.endDate) {
                    const d = new Date(e.target.value);
                    d.setDate(d.getDate() + 2);
                    updateFormData({ endDate: d.toISOString().split('T')[0] });
                  }
                }}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CalendarDays className="inline w-4 h-4 mr-1.5" />
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => updateFormData({ endDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {/* Day count preview */}
          {dayCount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <strong>{dayCount} day{dayCount > 1 ? 's' : ''}</strong> — Empty days will be created. Use the (+) buttons to add places to your itinerary.
            </div>
          )}

          {/* What you'll get */}
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">What you'll get</h3>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-xs">🌤️</span>
                Weather forecast
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-xs">🚌</span>
                Transport guide
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-xs">🎒</span>
                Packing suggestions
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-xs">📅</span>
                {dayCount || '—'} empty day{dayCount !== 1 ? 's' : ''} to fill
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSubmit}
            loading={isLoading}
            disabled={!canSubmit}
            icon={ArrowRight}
            size="lg"
          >
            {isLoading ? loadingMessage || 'Setting up...' : 'Create Trip'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
