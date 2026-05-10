import { useEffect, useRef, useState, useCallback } from 'react';

import { API_URLS } from '../services/api';

const WS_BASE = API_URLS.WS;

export function useGameWebSocket(groupId, playerId) {
  const ws = useRef(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!groupId || !playerId) return;

    let socket;
    let reconnectTimer;

    let pingInterval;

    const connect = () => {
      socket = new WebSocket(`${WS_BASE}/${groupId}/${playerId}`);
      ws.current = socket;

      socket.onopen = () => {
        setConnected(true);
        // Keep-alive: send ping every 25s to prevent idle-timeout disconnects on Render
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send('ping');
          }
        }, 25000);
      };
      socket.onclose = () => {
        setConnected(false);
        if (pingInterval) clearInterval(pingInterval);
        // Attempt to auto-reconnect after 2 seconds
        reconnectTimer = setTimeout(connect, 2000);
      };
      socket.onerror = (e) => console.error('WS Error', e);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Ignore keep-alive messages
          if (msg.type === 'PING' || msg.type === 'PONG') return;
          setLastMessage(msg);
        } catch (e) {
          console.error('WS parse error', e);
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingInterval) clearInterval(pingInterval);
      if (socket) {
        socket.onclose = null; // Prevent reconnect loop on intentional unmount
        socket.close();
      }
    };
  }, [groupId, playerId]);

  const sendMessage = useCallback((msg) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  return { lastMessage, connected, sendMessage };
}
