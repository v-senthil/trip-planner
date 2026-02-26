import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin, Sparkles, Globe, Route, DollarSign, Cloud,
  Backpack, Zap, ArrowRight, Shield, Trash2
} from 'lucide-react';
import useTripStore from '../store/tripStore';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Planning',
    desc: 'GPT-4o-mini crafts personalized day-by-day itineraries based on your style.',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    icon: Globe,
    title: 'Open-Source Maps',
    desc: 'Beautiful interactive maps with OpenStreetMap — no API bills, ever.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Route,
    title: 'Smart Routing',
    desc: 'OSRM optimizes routes between attractions for the shortest travel time.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: DollarSign,
    title: 'Budget Tracking',
    desc: 'Per-day and total budget estimates tailored to your spending level.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Cloud,
    title: 'Weather-Aware',
    desc: 'Auto-adjusts suggestions based on real-time weather conditions.',
    color: 'from-sky-500 to-blue-500',
  },
  {
    icon: Backpack,
    title: 'AI Packing List',
    desc: 'Smart packing suggestions based on destination, weather, and activities.',
    color: 'from-rose-500 to-pink-500',
  },
];

export default function HomePage() {
  const { savedTrips, fetchSavedTrips, loadTrip, deleteSavedTrip } = useTripStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSavedTrips();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950" />
        <div className="absolute top-20 -right-40 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-40 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Powered by AI + Open-Source Maps
            </div>

            <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl text-gray-900 dark:text-white text-balance leading-tight">
              Plan Your Dream{' '}
              <span className="bg-gradient-to-r from-primary-500 to-cyan-500 bg-clip-text text-transparent">
                Vacation
              </span>{' '}
              in Seconds
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-balance">
              Tell us where you want to go, and our AI creates a complete day-by-day itinerary
              with maps, routes, budgets, weather tips, and more.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/plan" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
                Start Planning
                <ArrowRight className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Shield className="w-4 h-4" />
                <span>No Google Maps billing — 100% open-source maps</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-gray-900 dark:text-white">
            Everything you need for the perfect trip
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-4 max-w-xl mx-auto">
            Smart features powered by AI and open-source technology.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card p-6 group"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white">{feat.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{feat.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Saved trips */}
      {savedTrips?.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-6">
            Your Saved Trips
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedTrips.map((trip) => (
              <div
                key={trip.id}
                className="card p-5 hover:shadow-card-hover transition-all cursor-pointer relative group"
                onClick={async () => {
                  await loadTrip(trip.id);
                  navigate('/itinerary');
                }}
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {trip.destination}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {trip.startDate && trip.endDate
                    ? `${trip.startDate} — ${trip.endDate}`
                    : trip.updatedAt
                    ? new Date(trip.updatedAt).toLocaleDateString()
                    : ''
                  }
                  {trip.country ? ` · ${trip.country}` : ''}
                </p>
                <button
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-all"
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
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tech stack */}
      <section className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400 dark:text-gray-500">
            <span>OpenStreetMap</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span>Leaflet</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span>OSRM</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span>Nominatim</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span>OpenAI</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span>React</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span>Tailwind CSS</span>
          </div>
        </div>
      </section>
    </div>
  );
}
