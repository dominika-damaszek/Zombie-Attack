from typing import Dict, List
from fastapi import WebSocket

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

    async def broadcast_to_group(self, group_id: str, message: dict):
        if group_id not in self.active_connections:
            return

        dead: List[WebSocket] = []
        for connection in list(self.active_connections[group_id]):
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"WS send error in group {group_id}: {e}")
                dead.append(connection)

        for connection in dead:
            self.disconnect(connection, group_id)

manager = ConnectionManager()
