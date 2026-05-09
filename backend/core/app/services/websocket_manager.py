"""
Industrial-Grade WebSocket Connection Manager.

Features:
- Active connection tracking
- User → WebSocket mapping
- Conversation → Users mapping
- Broadcast to conversation participants
- Broadcast to specific user
- Connection lifecycle management
- Heartbeat/ping-pong for connection health
- Graceful disconnection

Based on 2026 WebSocket best practices:
- Connection pooling
- Memory-efficient tracking
- Automatic cleanup
- Error handling

References:
- https://codelit.io/blog/websocket-real-time-architecture-patterns
- https://websocket.org/guides/frameworks/fastapi/
"""

import logging
import asyncio
from typing import Dict, Set, Optional, List
from fastapi import WebSocket
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

DEFAULT_TIMEZONE = "UTC"


class ConnectionManager:
    """
    Industrial-grade WebSocket connection manager.

    Features:
    - Active connection tracking (in-memory)
    - User → WebSocket mapping
    - Conversation → Users mapping
    - Broadcast to conversation
    - Broadcast to user
    - Connection health monitoring
    """

    def __init__(self):
        # user_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}

        # conversation_id -> Set[user_id]
        self.conversation_participants: Dict[str, Set[str]] = {}

        # user_id -> last_heartbeat
        self.last_heartbeat: Dict[str, datetime] = {}

        # Heartbeat interval (seconds)
        self.heartbeat_interval = 30

        # Heartbeat timeout (seconds)
        self.heartbeat_timeout = 60

    async def connect(self, websocket: WebSocket, user_id: str) -> bool:
        """
        Connect a user's WebSocket.

        Args:
            websocket: WebSocket connection
            user_id: User's UUID

        Returns:
            True if connected successfully
        """
        try:
            # Accept WebSocket connection
            await websocket.accept()

            # Disconnect existing connection (if any)
            if user_id in self.active_connections:
                logger.info(f"Replacing existing connection for user: {user_id[:8]}***")
                await self.disconnect(user_id)

            # Store connection
            self.active_connections[user_id] = websocket
            self.last_heartbeat[user_id] = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))

            logger.info(
                f"User connected: {user_id[:8]}***, total connections: {len(self.active_connections)}"
            )

            # Send connection confirmation
            await self.send_personal_message(
                {
                    "type": "connected",
                    "user_id": user_id,
                    "timestamp": datetime.now(ZoneInfo(DEFAULT_TIMEZONE)).isoformat(),
                },
                user_id,
            )

            return True

        except Exception as e:
            logger.error(f"Error connecting user {user_id[:8]}***: {e}")
            return False

    async def disconnect(self, user_id: str) -> bool:
        """
        Disconnect a user's WebSocket.

        Args:
            user_id: User's UUID

        Returns:
            True if disconnected successfully
        """
        try:
            # Get WebSocket
            websocket = self.active_connections.get(user_id)

            if websocket:
                # Close WebSocket
                try:
                    await websocket.close()
                except Exception as e:
                    logger.warning(f"Error closing WebSocket for {user_id[:8]}***: {e}")

                # Remove from active connections
                del self.active_connections[user_id]

                # Remove from heartbeat tracking
                if user_id in self.last_heartbeat:
                    del self.last_heartbeat[user_id]

                # Remove from conversation participants
                for conversation_id in list(self.conversation_participants.keys()):
                    if user_id in self.conversation_participants[conversation_id]:
                        self.conversation_participants[conversation_id].remove(user_id)

                        # Remove empty conversation sets
                        if not self.conversation_participants[conversation_id]:
                            del self.conversation_participants[conversation_id]

                logger.info(
                    f"User disconnected: {user_id[:8]}***, remaining connections: {len(self.active_connections)}"
                )

                return True

            return False

        except Exception as e:
            logger.error(f"Error disconnecting user {user_id[:8]}***: {e}")
            return False

    async def send_personal_message(self, message: dict, user_id: str) -> bool:
        """
        Send message to a specific user.

        Args:
            message: Message dict to send
            user_id: User's UUID

        Returns:
            True if sent successfully
        """
        try:
            websocket = self.active_connections.get(user_id)

            if websocket:
                await websocket.send_json(message)
                logger.debug(f"Message sent to user: {user_id[:8]}***")
                return True
            else:
                logger.debug(f"User not connected: {user_id[:8]}***")
                return False

        except Exception as e:
            logger.error(f"Error sending message to {user_id[:8]}***: {e}")
            # Disconnect on error
            await self.disconnect(user_id)
            return False

    async def broadcast_to_conversation(
        self, message: dict, conversation_id: str, exclude_user_id: Optional[str] = None
    ) -> int:
        """
        Broadcast message to all participants in a conversation.

        Args:
            message: Message dict to broadcast
            conversation_id: Conversation UUID
            exclude_user_id: User ID to exclude (e.g., sender)

        Returns:
            Number of users message was sent to
        """
        try:
            # Get participants
            participants = self.conversation_participants.get(conversation_id, set())

            # Filter out excluded user
            if exclude_user_id:
                participants = participants - {exclude_user_id}

            # Send to all online participants
            sent_count = 0
            for user_id in participants:
                if await self.send_personal_message(message, user_id):
                    sent_count += 1

            logger.debug(
                f"Broadcast to conversation {conversation_id[:8]}***: {sent_count}/{len(participants)} users"
            )

            return sent_count

        except Exception as e:
            logger.error(
                f"Error broadcasting to conversation {conversation_id[:8]}***: {e}"
            )
            return 0

    async def add_to_conversation(self, user_id: str, conversation_id: str):
        """
        Add user to conversation participant tracking.

        Args:
            user_id: User's UUID
            conversation_id: Conversation UUID
        """
        try:
            if conversation_id not in self.conversation_participants:
                self.conversation_participants[conversation_id] = set()

            self.conversation_participants[conversation_id].add(user_id)

            logger.debug(
                f"User {user_id[:8]}*** added to conversation {conversation_id[:8]}***"
            )

        except Exception as e:
            logger.error(f"Error adding user to conversation: {e}")

    async def remove_from_conversation(self, user_id: str, conversation_id: str):
        """
        Remove user from conversation participant tracking.

        Args:
            user_id: User's UUID
            conversation_id: Conversation UUID
        """
        try:
            if conversation_id in self.conversation_participants:
                self.conversation_participants[conversation_id].discard(user_id)

                # Remove empty conversation sets
                if not self.conversation_participants[conversation_id]:
                    del self.conversation_participants[conversation_id]

            logger.debug(
                f"User {user_id[:8]}*** removed from conversation {conversation_id[:8]}***"
            )

        except Exception as e:
            logger.error(f"Error removing user from conversation: {e}")

    async def get_online_users(self, conversation_id: str) -> List[str]:
        """
        Get list of online users in a conversation.

        Args:
            conversation_id: Conversation UUID

        Returns:
            List of online user IDs
        """
        try:
            participants = self.conversation_participants.get(conversation_id, set())

            # Filter to only connected users
            online_users = [
                user_id
                for user_id in participants
                if user_id in self.active_connections
            ]

            return online_users

        except Exception as e:
            logger.error(f"Error getting online users: {e}")
            return []

    async def update_heartbeat(self, user_id: str):
        """
        Update user's last heartbeat timestamp.

        Args:
            user_id: User's UUID
        """
        try:
            if user_id in self.active_connections:
                self.last_heartbeat[user_id] = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))
                logger.debug(f"Heartbeat updated for user: {user_id[:8]}***")
        except Exception as e:
            logger.error(f"Error updating heartbeat: {e}")

    async def check_stale_connections(self):
        """
        Check for stale connections and disconnect them.

        This should be run periodically (e.g., every minute).
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))
            timeout = timedelta(seconds=self.heartbeat_timeout)

            stale_users = []

            for user_id, last_beat in self.last_heartbeat.items():
                if now - last_beat > timeout:
                    stale_users.append(user_id)

            # Disconnect stale connections
            for user_id in stale_users:
                logger.warning(f"Disconnecting stale connection: {user_id[:8]}***")
                await self.disconnect(user_id)

            if stale_users:
                logger.info(f"Disconnected {len(stale_users)} stale connections")

        except Exception as e:
            logger.error(f"Error checking stale connections: {e}")

    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return len(self.active_connections)

    def get_conversation_count(self) -> int:
        """Get total number of active conversations."""
        return len(self.conversation_participants)

    def is_user_online(self, user_id: str) -> bool:
        """Check if user is currently online."""
        return user_id in self.active_connections

    async def broadcast_to_all(self, message: dict) -> int:
        """
        Broadcast message to all connected users.

        Args:
            message: Message dict to broadcast

        Returns:
            Number of users message was sent to
        """
        try:
            sent_count = 0

            for user_id in list(self.active_connections.keys()):
                if await self.send_personal_message(message, user_id):
                    sent_count += 1

            logger.info(
                f"Broadcast to all users: {sent_count}/{len(self.active_connections)}"
            )

            return sent_count

        except Exception as e:
            logger.error(f"Error broadcasting to all: {e}")
            return 0


# Singleton instance
_connection_manager: Optional[ConnectionManager] = None


def get_connection_manager() -> ConnectionManager:
    """Get or create connection manager singleton."""
    global _connection_manager
    if _connection_manager is None:
        _connection_manager = ConnectionManager()
    return _connection_manager


# Background task to check stale connections
async def start_stale_connection_checker():
    """
    Background task to check for stale connections.

    Runs every minute and disconnects connections that haven't
    sent a heartbeat in the last 60 seconds.
    """
    manager = get_connection_manager()

    while True:
        try:
            await asyncio.sleep(60)  # Check every minute
            await manager.check_stale_connections()
        except Exception as e:
            logger.error(f"Error in stale connection checker: {e}")
