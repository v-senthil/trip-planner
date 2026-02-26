import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, Eye, EyeOff, Save, Trash2, CheckCircle2,
  AlertCircle, RefreshCw, Bot, CloudSun, ShieldCheck,
  Sun, Moon,
} from 'lucide-react';
import api from '../utils/api';
import { useTheme } from '../context/ThemeContext';

// ─── Key metadata ─────────────────────────────────────────────────────────────

const KEY_META = {
  GEMINI_API_KEY: {
    label: 'Gemini API Key',
    description: 'Powers the AI trip planning feature. Get your key at aistudio.google.com.',
    icon: Bot,
    iconBg: 'from-purple-500 to-indigo-500',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  OPENWEATHER_API_KEY: {
    label: 'OpenWeather API Key',
    description: 'Provides live weather forecasts for your destination. Free tier available.',
    icon: CloudSun,
    iconBg: 'from-sky-500 to-blue-500',
    docsUrl: 'https://home.openweathermap.org/api_keys',
  },
};

const DEFAULT_META = {
  label: (name) => name,
  description: 'Custom API key.',
  icon: KeyRound,
  iconBg: 'from-gray-400 to-gray-600',
  docsUrl: null,
};

// ─── Individual key card ──────────────────────────────────────────────────────

function KeyCard({ keyEntry, onSaved, onDeleted }) {
  const meta = KEY_META[keyEntry.name] || DEFAULT_META;
  const Icon = meta.icon || KeyRound;
  const label = typeof meta.label === 'function' ? meta.label(keyEntry.name) : meta.label;

  const [value, setValue]       = useState('');
  const [visible, setVisible]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash]       = useState(null); // 'success' | 'error'
  const [flashMsg, setFlashMsg] = useState('');

  const showFlash = (type, msg) => {
    setFlash(type);
    setFlashMsg(msg);
    setTimeout(() => setFlash(null), 3000);
  };

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await api.put(`/settings/api-keys/${keyEntry.name}`, { value: value.trim() });
      setValue('');
      showFlash('success', 'Key saved and encrypted');
      onSaved();
    } catch (err) {
      showFlash('error', err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove ${label} from the database?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/settings/api-keys/${keyEntry.name}`);
      showFlash('success', 'Key removed');
      onDeleted();
    } catch (err) {
      showFlash('error', err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${meta.iconBg} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{label}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{keyEntry.name}</p>
          </div>
        </div>

        {/* Status badge */}
        {keyEntry.configured ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            Configured
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
            <AlertCircle className="w-3 h-3" />
            Not set
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 dark:text-gray-400">{meta.description}{' '}
        {meta.docsUrl && (
          <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer"
            className="text-primary-600 hover:underline font-medium">
            Get key →
          </a>
        )}
      </p>

      {/* Current hint */}
      {keyEntry.configured && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="text-xs text-gray-500">
            Stored encrypted &mdash; ends in{' '}
            <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{keyEntry.hint}</span>
          </span>
          {keyEntry.updatedAt && (
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
              Updated {new Date(keyEntry.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder={keyEntry.configured ? 'Enter new value to update…' : 'Paste your API key…'}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-mono
                       focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
                       bg-white dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={!value.trim() || saving}
          className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>

        {keyEntry.configured && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-secondary px-3 py-2.5 text-sm text-red-500 hover:text-red-600 hover:border-red-200"
          >
            {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Flash message */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
              flash === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {flash === 'success'
              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {flashMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const [keys, setKeys]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/settings/api-keys');
      setKeys(data.keys || []);
    } catch (err) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              API keys are stored encrypted in the local database using AES-256-GCM.
              They are never sent to the client after being saved.
            </p>
          </div>

          {/* Dark / light toggle */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
                       hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            {isDark ? (
              <><Sun className="w-4 h-4 text-amber-400" /><span className="text-sm font-medium">Light mode</span></>
            ) : (
              <><Moon className="w-4 h-4 text-indigo-500" /><span className="text-sm font-medium">Dark mode</span></>
            )}
          </button>
        </div>
      </motion.div>

      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">API Keys</h2>
      </div>

      {loading && (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-48 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
              </div>
              <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="card p-6 flex items-center gap-3 text-red-600 border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={fetchKeys} className="ml-auto btn-secondary text-sm px-3 py-1.5">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {keys.map((keyEntry) => (
            <KeyCard
              key={keyEntry.name}
              keyEntry={keyEntry}
              onSaved={fetchKeys}
              onDeleted={fetchKeys}
            />
          ))}
        </div>
      )}

      {/* Security notice */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex items-start gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400"
        >
          <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-500 flex-shrink-0" />
          <span>
            Keys are encrypted with <strong>AES-256-GCM</strong> before being written to the local SQLite database.
            The decrypted value is used server-side only and is never returned to the browser.
          </span>
        </motion.div>
      )}
    </div>
  );
}
