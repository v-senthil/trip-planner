// When the backend is hosted separately (e.g. GitHub Pages frontend + Railway backend),
// set VITE_API_URL during the build to the full backend origin (e.g. https://my-api.up.railway.app/api).
const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'tp_auth_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function handleUnauthorized() {
  localStorage.removeItem(TOKEN_KEY);
  // Respect the base path set by Vite (e.g. /trip-planner/)
  const base = import.meta.env.BASE_URL || '/';
  const loginPath = `${base}login`.replace('//', '/');
  if (!window.location.pathname.endsWith('/login')) {
    window.location.replace(loginPath);
  }
}

async function request(method, path, data) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const url = method === 'GET' && data
    ? `${API_BASE}${path}?${new URLSearchParams(data)}`
    : `${API_BASE}${path}`;

  const res = await fetch(url, options);

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired. Please log in again.');
  }

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || `Request failed: ${res.status}`);
  }

  return json;
}

const api = {
  get: (path, params) => request('GET', path, params),
  post: (path, data) => request('POST', path, data),
  put: (path, data) => request('PUT', path, data),
  patch: (path, data) => request('PATCH', path, data),
  delete: (path) => request('DELETE', path),

  // ─── Settings / API keys ───────────────────────────────────────────────
  /** List all API key entries (names + hints, no decrypted values). */
  listApiKeys: () => request('GET', '/settings/api-keys'),
  /** Save (encrypt & upsert) a named API key. */
  saveApiKey: (name, value) => request('PUT', `/settings/api-keys/${name}`, { value }),
  /** Remove a stored API key. */
  deleteApiKey: (name) => request('DELETE', `/settings/api-keys/${name}`),
};

export default api;
