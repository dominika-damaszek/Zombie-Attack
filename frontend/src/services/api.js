// Use relative URLs so Vite's proxy forwards requests to the backend.
// This works in both local dev (via Vite proxy) and in Replit's proxied iframe.
let API_BASE_URL = import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ''
  ? import.meta.env.VITE_API_URL
  : '';

if (API_BASE_URL.endsWith('/')) {
  API_BASE_URL = API_BASE_URL.slice(0, -1);
}

// WebSocket URL: derive from the current page's host so it works through any proxy
function getWsBase() {
  if (API_BASE_URL !== '') {
    return API_BASE_URL.replace(/^http/, 'ws');
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}`;
}

const WS_BASE_URL = getWsBase();

console.log('--- ZOMBIEWARE CONFIG ---');
console.log('API Base URL:', API_BASE_URL || '(relative)');
console.log('WS Base URL:', WS_BASE_URL);
console.log('-------------------------');

export const API_URLS = {
    BASE: API_BASE_URL,
    AUTH: `${API_BASE_URL}/auth`,
    SESSION: `${API_BASE_URL}/session`,
    PLAYER: `${API_BASE_URL}/player`,
    GAME: `${API_BASE_URL}/api/game`,
    WS: `${WS_BASE_URL}/api/game/ws`
};

export default API_BASE_URL;
