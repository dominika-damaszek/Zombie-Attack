import { useEffect, useRef, useState, useCallback } from 'react';

import { API_URLS } from '../services/api';

const WS_BASE = API_URLS.WS;

export function useGameWebSocket(groupId, playerId) {
  const ws = useRef(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!groupId || !playerId) return;

    const socket = new WebSocket(`${WS_BASE}/${groupId}/${playerId}`);
    ws.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = (e) => console.error('WS Error', e);
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setLastMessage(msg);
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    return () => {
      socket.close();
    };
  }, [groupId, playerId]);

  const sendMessage = useCallback((msg) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  return { lastMessage, connected, sendMessage };
}
