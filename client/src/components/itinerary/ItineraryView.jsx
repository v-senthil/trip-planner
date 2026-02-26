import { useState, useEffect } from 'react';
import { Map, List, LayoutGrid, Download, Save, Backpack, Bus, Globe, Clock } from 'lucide-react';
import useTripStore from '../../store/tripStore';
import DayCard from './DayCard';
import TimelineView from './TimelineView';
import DayMap from '../map/DayMap';
import WeatherWidget from '../features/WeatherWidget';
import BudgetEstimate from '../features/BudgetEstimate';
import CurrencyConverter from '../features/CurrencyConverter';
import PackingList from '../features/PackingList';
import TransportGuide from '../features/TransportGuide';
import Button from '../ui/Button';
import { LoadingOverlay } from '../ui/LoadingSkeleton';
import { formatDate } from '../../utils/formatters';

function TimeDifferenceCard({ timezone, destination }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  if (!timezone) return null;

  const { timeZone: tzName, utcOffset } = timezone;

  const parseOffset = (str) => {
    if (!str) return 0;
    const m = str.match(/^([+-])(\d{2}):(\d{2})/);
    if (!m) return 0;
    return (m[1] === '+' ? 1 : -1) * (parseInt(m[2]) * 60 + parseInt(m[3]));
  };

  const destOffsetMin = parseOffset(utcOffset);
  const localOffsetMin = -now.getTimezoneOffset();
  const diffMin = destOffsetMin - localOffsetMin;
  const diffHours = diffMin / 60;
  const absDiff = Math.abs(diffHours);
  const sign = diffHours > 0 ? '+' : diffHours < 0 ? '-' : '';
  const diffLabel = absDiff === 0
    ? 'Same timezone'
    : `${sign}${absDiff % 1 === 0 ? absDiff : absDiff.toFixed(1)}h from you`;

  const destTime = new Date(now.getTime() + diffMin * 60000);
  const fmtTime = (d) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="card p-5 bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-950/40 dark:to-sky-950/40">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-4 h-4 text-indigo-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Time in {destination}</h3>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{fmtTime(destTime)}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tzName}</p>
      <div className="flex items-center gap-3 mt-3">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
          diffMin === 0 ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
        }`}>
          <Clock className="w-3 h-3" />
          {diffLabel}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">Your time: {fmtTime(now)}</span>
      </div>
    </div>
  );
}

export default function ItineraryView() {
  const {
    itinerary,
    isLoading,
    loadingMessage,
    currentView,
    setView,
    selectedDay,
    setSelectedDay,
    downloadPDF,
    saveTrip,
    weather,
    weatherAdvice,
    convertedCurrency,
    destTimezone,
  } = useTripStore();

  const [showPackingList, setShowPackingList] = useState(false);
  const [showTransport, setShowTransport] = useState(false);

  if (!itinerary) return null;

  const days = itinerary.days || [];
  const currentDayData = days[selectedDay];

  const views = [
    { id: 'timeline', label: 'Timeline', icon: List },
    { id: 'card', label: 'Cards', icon: LayoutGrid },
    { id: 'map', label: 'Map', icon: Map },
  ];

  return (
    <div className="space-y-6">
      {isLoading && <LoadingOverlay message={loadingMessage} />}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">
            {itinerary.destination}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {itinerary.country} · {days.length} days · {itinerary.currency}
            {itinerary.startDate && itinerary.endDate && (
              <span> · {formatDate(itinerary.startDate)} – {formatDate(itinerary.endDate)}</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={Download} onClick={downloadPDF}>
            PDF
          </Button>
          <Button variant="secondary" size="sm" icon={Save} onClick={saveTrip}>
            Save
          </Button>
          <Button variant="secondary" size="sm" icon={Backpack} onClick={() => setShowPackingList(true)}>
            Packing List
          </Button>
          <Button variant="secondary" size="sm" icon={Bus} onClick={() => setShowTransport(true)}>
            Transport
          </Button>
        </div>
      </div>

      {/* Weather, Budget & Time Difference row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <WeatherWidget weather={weather} advice={weatherAdvice} />
        <BudgetEstimate days={days} currency={itinerary.currency} convertedCurrency={convertedCurrency} />
        <TimeDifferenceCard timezone={destTimezone} destination={itinerary.destination} />
      </div>

      {/* Currency converter */}
      <CurrencyConverter tripCurrency={itinerary.currency} />

      {/* Local tips */}
      {itinerary.localTips?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">💡 Local Tips</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {itinerary.localTips.map((tip, i) => (
              <p key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">•</span>
                {tip}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Day selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {days.map((day, i) => (
          <button
            key={i}
            onClick={() => setSelectedDay(i)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedDay === i
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div>Day {day.day}</div>
            {day.date && (
              <div className={`text-xs ${selectedDay === i ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                {formatDate(day.date)}
              </div>
            )}
          </button>
        ))}
        <button
          onClick={() => setSelectedDay(-1)}
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            selectedDay === -1
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          All Days
        </button>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {views.map((v) => {
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentView === v.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Content based on view and selection */}
      {selectedDay === -1 ? (
        // All days
        currentView === 'map' ? (
          <DayMap days={days} allDays />
        ) : currentView === 'timeline' ? (
          <div className="space-y-8">
            {days.map((day, i) => (
              <div key={i}>
                <h3 className="font-display font-bold text-lg dark:text-white mb-4">
                  Day {day.day}: {day.theme}
                  {day.date && (
                    <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">{formatDate(day.date)}</span>
                  )}
                </h3>
                <TimelineView day={day} dayIndex={i} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {days.map((day, i) => (
              <DayCard key={i} day={day} index={i} />
            ))}
          </div>
        )
      ) : currentDayData ? (
        // Single day
        currentView === 'map' ? (
          <DayMap days={[currentDayData]} dayIndex={selectedDay} />
        ) : currentView === 'timeline' ? (
          <TimelineView day={currentDayData} dayIndex={selectedDay} />
        ) : (
          <DayCard day={currentDayData} index={selectedDay} />
        )
      ) : null}

      {/* Emergency numbers */}
      {itinerary.emergencyNumbers && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🆘 Emergency Numbers</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(itinerary.emergencyNumbers).map(([key, val]) => (
              <span key={key} className="text-sm text-gray-600 dark:text-gray-300">
                <strong className="capitalize">{key}:</strong> {val}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Packing list modal */}
      {showPackingList && (
        <PackingList onClose={() => setShowPackingList(false)} />
      )}

      {/* Transport guide modal */}
      {showTransport && (
        <TransportGuide onClose={() => setShowTransport(false)} />
      )}
    </div>
  );
}
