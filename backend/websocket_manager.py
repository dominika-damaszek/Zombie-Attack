import asyncio
from typing import Dict, List
from fastapi import WebSocket

# Per-send timeout.  A dead/half-open client can take many seconds to fail
# its TCP write; without this bound a single bad connection would block
# every broadcast in its group.
_SEND_TIMEOUT_SEC = 3.0


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, group_id: str):
        await websocket.accept()
        if group_id not in self.active_connections:
            self.active_connections[group_id] = []
        if websocket not in self.active_connections[group_id]:
            self.active_connections[group_id].append(websocket)

    def disconnect(self, websocket: WebSocket, group_id: str):
        if group_id in self.active_connections:
            try:
                self.active_connections[group_id].remove(websocket)
            except ValueError:
                pass
            if not self.active_connections[group_id]:
                del self.active_connections[group_id]

    async def _send_one(self, ws: WebSocket, message: dict):
        await asyncio.wait_for(ws.send_json(message), timeout=_SEND_TIMEOUT_SEC)

    async def broadcast_to_group(self, group_id: str, message: dict):
        connections = list(self.active_connections.get(group_id, []))
        if not connections:
            return

        # Send to every client concurrently so one slow socket doesn't block
        # the others.  return_exceptions=True keeps one bad client from
        # cancelling the whole gather.
        results = await asyncio.gather(
            *[self._send_one(c, message) for c in connections],
            return_exceptions=True,
        )

        for conn, result in zip(connections, results):
            if isinstance(result, BaseException):
                # Don't log every closed-socket noise — common during reconnects.
                self.disconnect(conn, group_id)


manager = ConnectionManager()
