import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, CalendarDays, Wallet, Palmtree, Gauge, UtensilsCrossed,
  Car, Building, Sparkles, ArrowRight, ArrowLeft, Smile, Clock, Globe
} from 'lucide-react';
import useTripStore from '../../store/tripStore';
import DestinationInput from './DestinationInput';
import Button from '../ui/Button';

const STEPS = [
  { id: 'destination', title: 'Where & When', icon: MapPin },
  { id: 'style', title: 'Trip Style', icon: Palmtree },
  { id: 'preferences', title: 'Preferences', icon: UtensilsCrossed },
  { id: 'extras', title: 'Final Details', icon: Sparkles },
];

const VACATION_TYPES = [
  { value: 'beach', label: '🏖️ Beach', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  { value: 'adventure', label: '🧗 Adventure', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { value: 'relaxed', label: '🧘 Relaxed', color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'shopping', label: '🛍️ Shopping', color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { value: 'offbeat', label: '🗺️ Offbeat', color: 'bg-violet-50 border-violet-200 text-violet-700' },
  { value: 'waterfalls', label: '💧 Waterfalls', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'romantic', label: '💕 Romantic', color: 'bg-rose-50 border-rose-200 text-rose-700' },
  { value: 'family', label: '👨‍👩‍👧‍👦 Family', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { value: 'other', label: '✏️ Other', color: 'bg-gray-50 border-gray-300 text-gray-700' },
];

const BUDGET_OPTIONS = [
  { value: 'low', label: '💰 Budget', desc: 'Hostels, street food, public transport' },
  { value: 'medium', label: '💵 Moderate', desc: 'Hotels, restaurants, mixed transport' },
  { value: 'luxury', label: '💎 Luxury', desc: 'Resorts, fine dining, private transfers' },
];

const PACE_OPTIONS = [
  { value: 'jampacked', label: '⚡ Jampacked', desc: '5-6 places/day' },
  { value: 'balanced', label: '⚖️ Balanced', desc: '3-4 places/day' },
  { value: 'relaxed', label: '🌿 Relaxed', desc: '2-3 places/day' },
];

const FOOD_OPTIONS = [
  { value: 'veg', label: '🥗 Vegetarian' },
  { value: 'nonveg', label: '🍖 Non-Veg' },
  { value: 'local', label: '🍜 Local Cuisine' },
  { value: 'finedining', label: '🍽️ Fine Dining' },
];

const TRANSPORT_OPTIONS = [
  { value: 'public', label: '🚌 Public Transport' },
  { value: 'rental', label: '🛵 Rental Bike/Car' },
  { value: 'cab', label: '🚕 Cab Only' },
  { value: 'mixed', label: '🔄 Mixed' },
];

const MOOD_OPTIONS = [
  { value: 'chill', label: '😎 Chill' },
  { value: 'party', label: '🎉 Party' },
  { value: 'spiritual', label: '🙏 Spiritual' },
  { value: 'nature', label: '🌿 Nature' },
  { value: 'photography', label: '📸 Photography' },
];

function TimeDifferenceWidget({ timezone, destination, loading }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000); // update every 30s
    return () => clearInterval(t);
  }, []);

  if (loading || !timezone) return null;

  const { timeZone: tzName, utcOffset } = timezone;

  // Parse utcOffset string like "+05:30" or "-08:00" to minutes
  const parseOffset = (str) => {
    if (!str) return 0;
    const m = str.match(/^([+-])(\d{2}):(\d{2})/);
    if (!m) return 0;
    const sign = m[1] === '+' ? 1 : -1;
    return sign * (parseInt(m[2]) * 60 + parseInt(m[3]));
  };

  const destOffsetMin = parseOffset(utcOffset);
  const localOffsetMin = -now.getTimezoneOffset(); // JS returns inverted
  const diffMin = destOffsetMin - localOffsetMin;
  const diffHours = diffMin / 60;
  const absDiff = Math.abs(diffHours);
  const sign = diffHours > 0 ? '+' : diffHours < 0 ? '-' : '';
  const diffLabel = absDiff === 0
    ? 'Same timezone as you'
    : `${sign}${absDiff % 1 === 0 ? absDiff : absDiff.toFixed(1)}h from your time`;

  // Calculate destination current time
  const destTime = new Date(now.getTime() + diffMin * 60000);
  const formatTime = (d) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDate = (d) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/40 dark:to-sky-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-4 h-4 text-indigo-500" />
        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Time in {destination}</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatTime(destTime)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(destTime)} · {tzName}</p>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
            diffMin === 0
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
              : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            {diffLabel}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Your time: {formatTime(now)}</p>
        </div>
      </div>
    </div>
  );
}

export default function TripForm() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { formData, updateFormData, generateTrip, isLoading, loadingMessage, error, clearError } =
    useTripStore();

  // Timezone state
  const [destTimezone, setDestTimezone] = useState(null);
  const [tzLoading, setTzLoading] = useState(false);

  // Fetch timezone when destination coordinates change
  useEffect(() => {
    const coords = formData.destinationCoords;
    if (!coords) { setDestTimezone(null); return; }

    let cancelled = false;
    setTzLoading(true);
    fetch(`/api/places/timezone?lat=${coords.lat}&lng=${coords.lng}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) setDestTimezone(data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTzLoading(false); });

    return () => { cancelled = true; };
  }, [formData.destinationCoords]);

  const toggleArrayValue = (field, value) => {
    const arr = formData[field] || [];
    const next = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
    updateFormData({ [field]: next });
  };

  const canProceed = () => {
    switch (step) {
      case 0: return formData.destination?.length >= 2 && formData.startDate && formData.endDate && new Date(formData.endDate) >= new Date(formData.startDate);
      case 1: return formData.vacationType?.length > 0 && formData.budget && (!formData.vacationType.includes('other') || formData.customVacationType?.trim().length > 0);
      case 2: return formData.travelPace && formData.transportType;
      case 3: return true;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    try {
      await generateTrip();
      navigate('/itinerary');
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 px-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-200 dark:ring-primary-800'
                    : isDone
                    ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : isDone
                      ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <span className="hidden sm:block text-sm font-medium">{s.title}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded transition-colors ${
                    i < step ? 'bg-primary-300' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          );
        })}
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

      {/* Form Steps */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="card p-8"
        >
          {/* Step 0: Destination & Days */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-bold text-2xl dark:text-white mb-2">Where are you headed?</h2>
                <p className="text-gray-500 dark:text-gray-400">Start by telling us your dream destination and travel dates</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Destination</label>
                <DestinationInput
                  value={formData.destination}
                  onChange={(val) => {
                    updateFormData({ destination: val });
                    // Clear coords when user types manually (not from suggestion)
                  }}
                  onSelectCoords={(coords) => updateFormData({ destinationCoords: coords })}
                />
              </div>

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
                      // Auto-set end date if not set or if it's before start
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

              {formData.startDate && formData.endDate && (
                  <div className="bg-primary-50 dark:bg-primary-950/30 rounded-xl px-4 py-3 text-sm text-primary-700 dark:text-primary-300 font-medium">
                  📅 {(() => {
                    const start = new Date(formData.startDate);
                    const end = new Date(formData.endDate);
                    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
                    const fmt = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                    return `${fmt(start)} → ${fmt(end)} · ${days} day${days > 1 ? 's' : ''}`;
                  })()}
                </div>
              )}

              {/* Time difference widget */}
              {formData.destinationCoords && destTimezone && (
                <TimeDifferenceWidget timezone={destTimezone} destination={formData.destination} loading={tzLoading} />
              )}
              {tzLoading && formData.destinationCoords && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  Loading timezone...
                </div>
              )}
            </div>
          )}

          {/* Step 1: Trip Style */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-bold text-2xl dark:text-white mb-2">What's your style?</h2>
                <p className="text-gray-500 dark:text-gray-400">Select one or more vacation types</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Vacation Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {VACATION_TYPES.map((type) => {
                    const isSelected = formData.vacationType?.includes(type.value);
                    return (
                      <button
                        key={type.value}
                        onClick={() => toggleArrayValue('vacationType', type.value)}
                        className={`chip text-center justify-center py-3 ${
                          isSelected ? type.color + ' ring-2 ring-offset-1' : 'chip-inactive'
                        }`}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom vacation type input when "Other" is selected */}
                {formData.vacationType?.includes('other') && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={formData.customVacationType || ''}
                      onChange={(e) => updateFormData({ customVacationType: e.target.value })}
                      placeholder="Describe your vacation style..."
                      className="input-field"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Wallet className="inline w-4 h-4 mr-1.5" />
                  Budget
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {BUDGET_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateFormData({ budget: opt.value })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.budget === opt.value
                          ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/30 ring-2 ring-primary-200 dark:ring-primary-800'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="font-medium dark:text-white">{opt.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-bold text-2xl dark:text-white mb-2">Your preferences</h2>
                <p className="text-gray-500 dark:text-gray-400">Help us tailor the perfect trip for you</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Gauge className="inline w-4 h-4 mr-1.5" />
                  Travel Pace
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {PACE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateFormData({ travelPace: opt.value })}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        formData.travelPace === opt.value
                          ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/30 ring-2 ring-primary-200 dark:ring-primary-800'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="font-medium dark:text-white">{opt.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <UtensilsCrossed className="inline w-4 h-4 mr-1.5" />
                  Food Preference
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FOOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggleArrayValue('foodPreference', opt.value)}
                      className={`chip justify-center py-2.5 ${
                        formData.foodPreference?.includes(opt.value) ? 'chip-active' : 'chip-inactive'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Car className="inline w-4 h-4 mr-1.5" />
                  Transport
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {TRANSPORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateFormData({ transportType: opt.value })}
                      className={`chip justify-center py-2.5 ${
                        formData.transportType === opt.value ? 'chip-active' : 'chip-inactive'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Extras */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-bold text-2xl dark:text-white mb-2">Final touches</h2>
                <p className="text-gray-500 dark:text-gray-400">Optional details for a more personalized trip</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building className="inline w-4 h-4 mr-1.5" />
                  Accommodation Area (optional)
                </label>
                <input
                  type="text"
                  value={formData.accommodationArea}
                  onChange={(e) => updateFormData({ accommodationArea: e.target.value })}
                  placeholder="e.g., Near city center, beachfront"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Smile className="inline w-4 h-4 mr-1.5" />
                  Trip Mood
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Select one or more</p>
                <div className="flex flex-wrap gap-3">
                  {MOOD_OPTIONS.map((opt) => {
                    const isSelected = formData.mood?.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleArrayValue('mood', opt.value)}
                        className={`chip ${isSelected ? 'chip-active' : 'chip-inactive'}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-5 space-y-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">Trip Summary</h3>
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <p>📍 <strong>{formData.destination}</strong></p>
                  <p>📅 {formData.startDate && formData.endDate ? (() => {
                    const s = new Date(formData.startDate);
                    const e = new Date(formData.endDate);
                    const days = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
                    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return `${fmt(s)} – ${fmt(e)} (${days} days)`;
                  })() : 'Dates not set'}</p>
                  <p>💰 Budget: {formData.budget}</p>
                  <p>🎯 Style: {(() => {
                    const types = (formData.vacationType || []).map(v => v === 'other' ? formData.customVacationType || 'Other' : v);
                    return types.join(', ') || 'Not set';
                  })()}</p>
                  <p>⚡ Pace: {formData.travelPace}</p>
                  <p>🍽️ Food: {formData.foodPreference?.join(', ') || 'Any'}</p>
                  <p>🚗 Transport: {formData.transportType}</p>
                  {formData.mood?.length > 0 && <p>😊 Mood: {formData.mood.join(', ')}</p>}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          icon={ArrowLeft}
        >
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            icon={ArrowRight}
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            loading={isLoading}
            icon={Sparkles}
            size="lg"
            disabled={!canProceed()}
          >
            {isLoading ? loadingMessage || 'Planning...' : 'Generate My Trip ✨'}
          </Button>
        )}
      </div>
    </div>
  );
}
