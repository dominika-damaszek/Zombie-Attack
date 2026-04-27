from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps group_id -> list of active websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, group_id: str):
        await websocket.accept()
        if group_id not in self.active_connections:
            self.active_connections[group_id] = []
        self.active_connections[group_id].append(websocket)

    def disconnect(self, websocket: WebSocket, group_id: str):
        if group_id in self.active_connections:
            self.active_connections[group_id].remove(websocket)
            if not self.active_connections[group_id]:
                del self.active_connections[group_id]

    async def broadcast_to_group(self, group_id: str, message: dict):
        if group_id in self.active_connections:
            for connection in self.active_connections[group_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending message to client in group {group_id}: {e}")

manager = ConnectionManager()
