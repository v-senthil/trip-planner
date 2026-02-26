import { MapPin, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <MapPin className="w-4 h-4" />
            <span>TripPlanner AI — Powered by open-source maps</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-sm">
            <span>Built with</span>
            <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
            <span>using OpenStreetMap, Leaflet & OSRM</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
