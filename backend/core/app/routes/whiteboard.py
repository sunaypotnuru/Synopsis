from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whiteboard", tags=["whiteboard"])


class ConnectionManager:
    def __init__(self):
        # Map room_id to a list of connected WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        logger.info(
            f"Client connected to room {room_id}. Total: {len(self.active_connections[room_id])}"
        )

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
        logger.info(f"Client disconnected from room {room_id}.")

    async def broadcast(self, message: str, room_id: str, sender: WebSocket):
        """Broadcast delta diffs to all clients in the room except the sender."""
        if room_id in self.active_connections:
            # We don't parse the message, just pass it through for low latency
            disconnected = []
            for connection in self.active_connections[room_id]:
                if connection != sender:
                    try:
                        await connection.send_text(message)
                    except Exception as e:
                        logger.error(f"Error broadcasting to client in {room_id}: {e}")
                        disconnected.append(connection)

            # Clean up dead connections
            for conn in disconnected:
                self.disconnect(conn, room_id)


manager = ConnectionManager()


@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    try:
        while True:
            # Receive delta diffs from the client
            data = await websocket.receive_text()
            # Broadcast pure string, avoiding JSON overhead on the server
            await manager.broadcast(data, room_id, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
    except Exception as e:
        logger.error(f"WebSocket error in room {room_id}: {e}")
        manager.disconnect(websocket, room_id)
