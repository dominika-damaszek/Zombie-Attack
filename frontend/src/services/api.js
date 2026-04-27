let API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Production Fallback: Ensure we don't try to connect to the frontend URL if things go wrong
if (API_BASE_URL.includes('zombie-attack-frontend.onrender.com') || API_BASE_URL === 'https://zombie-attack.onrender.com') {
    console.warn("VITE_API_URL incorrectly pointing to frontend. Using hardcoded backend fallback.");
    API_BASE_URL = 'https://zombie-attack-backend.onrender.com';
}
if (API_BASE_URL.endsWith('/')) {
  API_BASE_URL = API_BASE_URL.slice(0, -1);
}

// WebSocket URL derived from API_BASE_URL
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

console.log('--- ZOMBIEWARE CONFIG ---');
console.log('API Base URL:', API_BASE_URL);
console.log('WS Base URL:', WS_BASE_URL);
console.log('-------------------------');

export const API_URLS = {
    BASE: API_BASE_URL,
    AUTH: `${API_BASE_URL}/auth`,
    SESSION: `${API_BASE_URL}/session`,
    PLAYER: `${API_BASE_URL}/player`,
    GAME: `${API_BASE_URL}/game`,
    WS: `${WS_BASE_URL}/api/game/ws`
};

export default API_BASE_URL;
