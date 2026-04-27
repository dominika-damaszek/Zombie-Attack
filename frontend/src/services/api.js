const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// WebSocket URL derived from API_BASE_URL
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export const API_URLS = {
    BASE: API_BASE_URL,
    AUTH: `${API_BASE_URL}/auth`,
    SESSION: `${API_BASE_URL}/session`,
    PLAYER: `${API_BASE_URL}/player`,
    GAME: `${API_BASE_URL}/game`,
    WS: `${WS_BASE_URL}/api/game/ws`
};

export default API_BASE_URL;
