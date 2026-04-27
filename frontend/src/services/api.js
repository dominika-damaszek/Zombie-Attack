let API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
if (API_BASE_URL.endsWith('/')) {
  API_BASE_URL = API_BASE_URL.slice(0, -1);
}

// WebSocket URL derived from API_BASE_URL
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

console.log('Zombieware API Base URL:', API_BASE_URL);
console.log('Zombieware WS Base URL:', WS_BASE_URL);

export const API_URLS = {
    BASE: API_BASE_URL,
    AUTH: `${API_BASE_URL}/auth`,
    SESSION: `${API_BASE_URL}/session`,
    PLAYER: `${API_BASE_URL}/player`,
    GAME: `${API_BASE_URL}/game`,
    WS: `${WS_BASE_URL}/api/game/ws`
};

export default API_BASE_URL;
