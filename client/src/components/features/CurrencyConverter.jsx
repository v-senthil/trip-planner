import { useState, useEffect, useCallback } from 'react';
import { ArrowRightLeft, RefreshCw, ChevronDown } from 'lucide-react';
import api from '../../utils/api';
import useTripStore from '../../store/tripStore';

const POPULAR_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY',
  'INR', 'SGD', 'THB', 'IDR', 'MYR', 'PHP', 'VND', 'KRW',
  'NZD', 'AED', 'SAR', 'BRL', 'MXN', 'ZAR', 'TRY', 'SEK',
  'NOK', 'DKK', 'HKD', 'TWD', 'CZK', 'PLN', 'HUF', 'BGN',
  'RON', 'ISK', 'ILS',
];

export default function CurrencyConverter({ tripCurrency }) {
  const [currencies, setCurrencies] = useState({});
  const [from, setFrom] = useState(tripCurrency || 'USD');
  const [to, setTo] = useState('USD');
  const [amount, setAmount] = useState(1000);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rateDate, setRateDate] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const setConvertedCurrency = useTripStore((s) => s.setConvertedCurrency);

  // Load currency list once
  useEffect(() => {
    api.get('/currency/list')
      .then((data) => setCurrencies(data.currencies || {}))
      .catch(() => {
        // Fallback to popular currencies
        const fallback = {};
        POPULAR_CURRENCIES.forEach((c) => { fallback[c] = c; });
        setCurrencies(fallback);
      });
  }, []);

  // Set sensible defaults from trip currency
  useEffect(() => {
    if (tripCurrency) {
      setFrom(tripCurrency);
      setTo(tripCurrency === 'USD' ? 'EUR' : 'USD');
    }
  }, [tripCurrency]);

  const convert = useCallback(async () => {
    if (!from || !to || !amount) return;
    setLoading(true);
    try {
      const data = await api.get('/currency/convert', { from, to, amount });
      setResult(data);
      setRateDate(null);
      // Push rate into global store so all budget displays can use it
      setConvertedCurrency({ code: to, rate: data.rate, name: currencies[to] || to });
      // Also fetch the rate date
      const ratesData = await api.get('/currency/rates', { from, to });
      setRateDate(ratesData.date);
    } catch (err) {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, amount, currencies, setConvertedCurrency]);

  // Auto-convert when inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount > 0) convert();
    }, 300);
    return () => clearTimeout(timer);
  }, [from, to, amount, convert]);

  const swapCurrencies = () => {
    setFrom(to);
    setTo(from);
  };

  const sortedCurrencies = Object.keys(currencies).sort((a, b) => {
    const aPopular = POPULAR_CURRENCIES.indexOf(a);
    const bPopular = POPULAR_CURRENCIES.indexOf(b);
    if (aPopular !== -1 && bPopular !== -1) return aPopular - bPopular;
    if (aPopular !== -1) return -1;
    if (bPopular !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="card overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-primary-500" />
          <span className="font-semibold text-gray-900 dark:text-white text-sm">Currency Converter</span>
          {result && !isOpen && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              1 {from} = {result.rate.toFixed(4)} {to}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Converter body */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {/* Amount input */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100"
              min="0"
              step="any"
            />
          </div>

          {/* From / swap / To */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">From</label>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                {sortedCurrencies.map((code) => (
                  <option key={code} value={code}>
                    {code} — {currencies[code]}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={swapCurrencies}
              className="shrink-0 p-2 mb-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
              title="Swap currencies"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">To</label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                {sortedCurrencies.map((code) => (
                  <option key={code} value={code}>
                    {code} — {currencies[code]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Result */}
          {loading ? (
            <div className="flex items-center gap-2 py-3">
              <RefreshCw className="w-4 h-4 text-primary-500 animate-spin" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Converting...</span>
            </div>
          ) : result ? (
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-950/40 dark:to-blue-950/40 rounded-xl p-3">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {result.amount.toLocaleString()} {result.from} ={' '}
                <span className="text-primary-600 dark:text-primary-400">
                  {result.converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {result.to}
                </span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                1 {result.from} = {result.rate.toFixed(4)} {result.to}
                {rateDate && ` · Rate as of ${rateDate}`}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
