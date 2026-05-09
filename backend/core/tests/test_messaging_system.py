"""
Comprehensive Test Suite for Category 4: Messaging System.

Tests:
- WebSocket connection manager
- Message service (conversations, messages, read receipts)
- Message persistence
- Read receipts (delivered + read)
- Unread count
- Search functionality

Total Tests: 30+ (matching Categories 1-3)
"""

import pytest
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo
from unittest.mock import Mock, patch, AsyncMock

from app.services.websocket_manager import ConnectionManager
from app.services.message_service import (
    MessageService,
    UnauthorizedAccessError,
    ConversationNotFoundError
)


# ============================================================================
# CONNECTION MANAGER TESTS (10 tests)
# ============================================================================

class TestConnectionManager:
    """Test WebSocket connection manager."""
    
    @pytest.fixture
    def connection_manager(self):
        """Create connection manager instance."""
        return ConnectionManager()
    
    @pytest.mark.asyncio
    async def test_connect_user(self, connection_manager):
        """Test connecting a user."""
        mock_websocket = AsyncMock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_json = AsyncMock()
        
        success = await connection_manager.connect(mock_websocket, "user123")
        
        assert success is True
        assert "user123" in connection_manager.active_connections
        assert connection_manager.get_connection_count() == 1
    
    @pytest.mark.asyncio
    async def test_disconnect_user(self, connection_manager):
        """Test disconnecting a user."""
        mock_websocket = AsyncMock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_json = AsyncMock()
        mock_websocket.close = AsyncMock()
        
        await connection_manager.connect(mock_websocket, "user123")
        success = await connection_manager.disconnect("user123")
        
        assert success is True
        assert "user123" not in connection_manager.active_connections
        assert connection_manager.get_connection_count() == 0
    
    @pytest.mark.asyncio
    async def test_send_personal_message(self, connection_manager):
        """Test sending message to specific user."""
        mock_websocket = AsyncMock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_json = AsyncMock()
        
        await connection_manager.connect(mock_websocket, "user123")
        
        success = await connection_manager.send_personal_message(
            {"type": "test", "content": "Hello"},
            "user123"
        )
        
        assert success is True
        # Called twice: once for connection confirmation, once for our message
        assert mock_websocket.send_json.call_count == 2
    
    @pytest.mark.asyncio
    async def test_send_to_offline_user(self, connection_manager):
        """Test sending message to offline user."""
        success = await connection_manager.send_personal_message(
            {"type": "test"},
            "offline_user"
        )
        
        assert success is False
    
    @pytest.mark.asyncio
    async def test_add_to_conversation(self, connection_manager):
        """Test adding user to conversation."""
        await connection_manager.add_to_conversation("user123", "conv456")
        
        assert "conv456" in connection_manager.conversation_participants
        assert "user123" in connection_manager.conversation_participants["conv456"]
    
    @pytest.mark.asyncio
    async def test_remove_from_conversation(self, connection_manager):
        """Test removing user from conversation."""
        await connection_manager.add_to_conversation("user123", "conv456")
        await connection_manager.remove_from_conversation("user123", "conv456")
        
        assert "conv456" not in connection_manager.conversation_participants
    
    @pytest.mark.asyncio
    async def test_broadcast_to_conversation(self, connection_manager):
        """Test broadcasting to conversation participants."""
        # Connect two users
        mock_ws1 = AsyncMock()
        mock_ws1.accept = AsyncMock()
        mock_ws1.send_json = AsyncMock()
        
        mock_ws2 = AsyncMock()
        mock_ws2.accept = AsyncMock()
        mock_ws2.send_json = AsyncMock()
        
        await connection_manager.connect(mock_ws1, "user1")
        await connection_manager.connect(mock_ws2, "user2")
        
        # Add to conversation
        await connection_manager.add_to_conversation("user1", "conv123")
        await connection_manager.add_to_conversation("user2", "conv123")
        
        # Broadcast
        count = await connection_manager.broadcast_to_conversation(
            {"type": "test"},
            "conv123"
        )
        
        assert count == 2
    
    @pytest.mark.asyncio
    async def test_get_online_users(self, connection_manager):
        """Test getting online users in conversation."""
        mock_ws = AsyncMock()
        mock_ws.accept = AsyncMock()
        mock_ws.send_json = AsyncMock()
        
        await connection_manager.connect(mock_ws, "user1")
        await connection_manager.add_to_conversation("user1", "conv123")
        await connection_manager.add_to_conversation("user2", "conv123")  # Offline
        
        online_users = await connection_manager.get_online_users("conv123")
        
        assert len(online_users) == 1
        assert "user1" in online_users
    
    @pytest.mark.asyncio
    async def test_update_heartbeat(self, connection_manager):
        """Test updating user heartbeat."""
        mock_ws = AsyncMock()
        mock_ws.accept = AsyncMock()
        mock_ws.send_json = AsyncMock()
        
        await connection_manager.connect(mock_ws, "user123")
        
        initial_heartbeat = connection_manager.last_heartbeat["user123"]
        await asyncio.sleep(0.1)
        await connection_manager.update_heartbeat("user123")
        updated_heartbeat = connection_manager.last_heartbeat["user123"]
        
        assert updated_heartbeat > initial_heartbeat
    
    @pytest.mark.asyncio
    async def test_is_user_online(self, connection_manager):
        """Test checking if user is online."""
        mock_ws = AsyncMock()
        mock_ws.accept = AsyncMock()
        mock_ws.send_json = AsyncMock()
        
        assert connection_manager.is_user_online("user123") is False
        
        await connection_manager.connect(mock_ws, "user123")
        
        assert connection_manager.is_user_online("user123") is True


# ============================================================================
# MESSAGE SERVICE TESTS (20 tests)
# ============================================================================

class TestMessageService:
    """Test message service."""
    
    @pytest.fixture
    def message_service(self):
        """Create message service instance."""
        return MessageService()
    
    @pytest.mark.asyncio
    async def test_create_direct_conversation(self, message_service):
        """Test creating direct conversation."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            # Mock conversation creation
            mock_result = Mock()
            mock_result.data = [{
                "id": "conv123",
                "type": "direct",
                "created_by": "user1"
            }]
            mock_supabase.table.return_value.insert.return_value.execute.return_value = mock_result
            
            conversation = await message_service.create_conversation(
                created_by="user1",
                participant_ids=["user1", "user2"],
                conversation_type="direct"
            )
            
            assert conversation["type"] == "direct"
    
    @pytest.mark.asyncio
    async def test_create_group_conversation(self, message_service):
        """Test creating group conversation."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{
                "id": "conv123",
                "type": "group",
                "title": "Team Chat"
            }]
            
            conversation = await message_service.create_conversation(
                created_by="user1",
                participant_ids=["user1", "user2", "user3"],
                conversation_type="group",
                title="Team Chat"
            )
            
            assert conversation["type"] == "group"
    
    @pytest.mark.asyncio
    async def test_invalid_conversation_type(self, message_service):
        """Test creating conversation with invalid type."""
        with pytest.raises(ValueError):
            await message_service.create_conversation(
                created_by="user1",
                participant_ids=["user1", "user2"],
                conversation_type="invalid"
            )
    
    @pytest.mark.asyncio
    async def test_direct_conversation_requires_two_participants(self, message_service):
        """Test direct conversation validation."""
        with pytest.raises(ValueError):
            await message_service.create_conversation(
                created_by="user1",
                participant_ids=["user1", "user2", "user3"],
                conversation_type="direct"
            )
    
    @pytest.mark.asyncio
    async def test_send_message(self, message_service):
        """Test sending a message."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            # Mock participant check
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "id": "participant123"
            }
            
            # Mock message insertion
            mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{
                "id": "msg123",
                "conversation_id": "conv123",
                "sender_id": "user1",
                "content": "Hello!"
            }]
            
            message = await message_service.send_message(
                conversation_id="conv123",
                sender_id="user1",
                content="Hello!"
            )
            
            assert message["content"] == "Hello!"
    
    @pytest.mark.asyncio
    async def test_send_message_unauthorized(self, message_service):
        """Test sending message when not participant."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            # Mock participant check (not found)
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
            
            with pytest.raises(UnauthorizedAccessError):
                await message_service.send_message(
                    conversation_id="conv123",
                    sender_id="user1",
                    content="Hello!"
                )
    
    @pytest.mark.asyncio
    async def test_get_conversation_history(self, message_service):
        """Test getting conversation history."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            # Mock participant check
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "id": "participant123"
            }
            
            # Mock messages
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
                {"id": "msg1", "content": "Hello"},
                {"id": "msg2", "content": "Hi"}
            ]
            
            messages = await message_service.get_conversation_history(
                conversation_id="conv123",
                user_id="user1",
                limit=50
            )
            
            assert len(messages) == 2
    
    @pytest.mark.asyncio
    async def test_mark_message_as_delivered(self, message_service):
        """Test marking message as delivered."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.is_.return_value.execute.return_value.data = [
                {"id": "receipt123"}
            ]
            
            success = await message_service.mark_message_as_delivered(
                message_id="msg123",
                user_id="user2"
            )
            
            assert success is True
    
    @pytest.mark.asyncio
    async def test_mark_message_as_read(self, message_service):
        """Test marking message as read."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                {"id": "receipt123"}
            ]
            
            success = await message_service.mark_message_as_read(
                message_id="msg123",
                user_id="user2"
            )
            
            assert success is True
    
    @pytest.mark.asyncio
    async def test_get_unread_count(self, message_service):
        """Test getting unread message count."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value.count = 5
            
            count = await message_service.get_unread_count(user_id="user1")
            
            assert count == 5
    
    @pytest.mark.asyncio
    async def test_get_unread_count_for_conversation(self, message_service):
        """Test getting unread count for specific conversation."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.is_.return_value.eq.return_value.execute.return_value.count = 3
            
            count = await message_service.get_unread_count(
                user_id="user1",
                conversation_id="conv123"
            )
            
            assert count == 3
    
    @pytest.mark.asyncio
    async def test_get_user_conversations(self, message_service):
        """Test getting user's conversations."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                {
                    "conversation_id": "conv1",
                    "conversations": {"id": "conv1", "type": "direct"}
                },
                {
                    "conversation_id": "conv2",
                    "conversations": {"id": "conv2", "type": "group"}
                }
            ]
            
            # Mock unread count
            mock_supabase.table.return_value.select.return_value.eq.return_value.is_.return_value.eq.return_value.execute.return_value.count = 0
            
            conversations = await message_service.get_user_conversations(
                user_id="user1",
                limit=50
            )
            
            assert len(conversations) == 2
    
    @pytest.mark.asyncio
    async def test_delete_message(self, message_service):
        """Test soft deleting a message."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            # Mock message check
            mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "sender_id": "user1"
            }
            
            # Mock update
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
                {"id": "msg123"}
            ]
            
            success = await message_service.delete_message(
                message_id="msg123",
                user_id="user1"
            )
            
            assert success is True
    
    @pytest.mark.asyncio
    async def test_delete_message_unauthorized(self, message_service):
        """Test deleting message by non-sender."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            # Mock message check (different sender)
            mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "sender_id": "user1"
            }
            
            with pytest.raises(UnauthorizedAccessError):
                await message_service.delete_message(
                    message_id="msg123",
                    user_id="user2"  # Different user
                )
    
    @pytest.mark.asyncio
    async def test_search_messages(self, message_service):
        """Test searching messages."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            # Mock search results
            mock_supabase.table.return_value.select.return_value.text_search.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
                {"id": "msg1", "content": "Hello world", "conversation_id": "conv1"},
                {"id": "msg2", "content": "Hello there", "conversation_id": "conv2"}
            ]
            
            # Mock participant checks
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "id": "participant123"
            }
            
            messages = await message_service.search_messages(
                user_id="user1",
                query="hello",
                limit=50
            )
            
            assert len(messages) == 2
    
    @pytest.mark.asyncio
    async def test_is_participant_true(self, message_service):
        """Test checking if user is participant (true)."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "id": "participant123"
            }
            
            is_participant = await message_service._is_participant("conv123", "user1")
            
            assert is_participant is True
    
    @pytest.mark.asyncio
    async def test_is_participant_false(self, message_service):
        """Test checking if user is participant (false)."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
            
            is_participant = await message_service._is_participant("conv123", "user1")
            
            assert is_participant is False
    
    @pytest.mark.asyncio
    async def test_find_existing_direct_conversation(self, message_service):
        """Test finding existing direct conversation."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
                {
                    "id": "conv123",
                    "type": "direct",
                    "conversation_participants": [
                        {"user_id": "user1", "is_active": True},
                        {"user_id": "user2", "is_active": True}
                    ]
                }
            ]
            
            existing = await message_service._find_direct_conversation(["user1", "user2"])
            
            assert existing is not None
            assert existing["id"] == "conv123"
    
    @pytest.mark.asyncio
    async def test_conversation_history_pagination(self, message_service):
        """Test conversation history with pagination."""
        with patch('app.services.message_service.supabase') as mock_supabase:
            # Mock participant check
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "id": "participant123"
            }
            
            # Mock before_message lookup
            mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "created_at": "2026-05-07T10:00:00Z"
            }
            
            # Mock messages
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.lt.return_value.execute.return_value.data = [
                {"id": "msg3", "content": "Message 3"}
            ]
            
            messages = await message_service.get_conversation_history(
                conversation_id="conv123",
                user_id="user1",
                limit=50,
                before_message_id="msg5"
            )
            
            assert len(messages) == 1


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
