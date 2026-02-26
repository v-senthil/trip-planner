import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';

export default function DestinationInput({ value, onChange, onSelectCoords }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places/geocode?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await res.json();
        if (data.results) {
          setSuggestions(data.results.slice(0, 5));
          setIsOpen(true);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (suggestion) => {
      const name = suggestion.name.split(',')[0];
      setQuery(name);
      onChange(name);
      if (onSelectCoords) {
        onSelectCoords({ lat: suggestion.lat, lng: suggestion.lng });
      }
      setIsOpen(false);
    },
    [onChange, onSelectCoords]
  );

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Where do you want to go?"
          className="input-field pl-12 pr-10 text-lg"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500 animate-spin" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-slide-down">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSelect(s)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <MapPin className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {s.name.split(',')[0]}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{s.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
