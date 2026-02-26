import { Cloud, Sun, CloudRain, Thermometer, Wind, Droplets } from 'lucide-react';

const weatherIcons = {
  Clear: Sun,
  Clouds: Cloud,
  Rain: CloudRain,
  Drizzle: CloudRain,
  Thunderstorm: CloudRain,
};

export default function WeatherWidget({ weather, advice }) {
  if (!weather) {
    return (
      <div className="card p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🌦️ Weather</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Weather data unavailable. Set OPENWEATHER_API_KEY to enable.
        </p>
      </div>
    );
  }

  const Icon = weatherIcons[weather.current.weather] || Cloud;

  return (
    <div className="card p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">🌦️ Weather in {weather.current.city}</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {Math.round(weather.current.temp)}°C
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{weather.current.description}</p>
        </div>
        <Icon className="w-12 h-12 text-blue-400" />
      </div>

      <div className="flex gap-4 mt-4 text-sm text-gray-600 dark:text-gray-300">
        <span className="flex items-center gap-1">
          <Thermometer className="w-3.5 h-3.5" />
          Feels {Math.round(weather.current.feelsLike)}°C
        </span>
        <span className="flex items-center gap-1">
          <Droplets className="w-3.5 h-3.5" />
          {weather.current.humidity}%
        </span>
        <span className="flex items-center gap-1">
          <Wind className="w-3.5 h-3.5" />
          {weather.current.windSpeed} m/s
        </span>
      </div>

      {/* Forecast */}
      {weather.forecast?.length > 0 && (
        <div className="flex gap-3 mt-4 overflow-x-auto scrollbar-hide">
          {weather.forecast.slice(0, 5).map((day, i) => (
            <div key={i} className="shrink-0 text-center bg-white/60 dark:bg-white/10 rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
              </div>
              <div className="text-sm font-semibold dark:text-white mt-1">
                {Math.round(day.tempMax)}°
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {Math.round(day.tempMin)}°
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Advice */}
      {advice?.advice?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-900/40">
          {advice.advice.map((a, i) => (
            <p key={i} className="text-xs text-blue-700 dark:text-blue-300 mt-1">💡 {a}</p>
          ))}
        </div>
      )}
    </div>
  );
}
