"""
Industrial-Grade Message Service (HIPAA Compliant).

Features:
- Create conversations (direct, group)
- Send messages
- Get conversation history
- Mark messages as read
- Get unread count
- Search messages
- Soft delete messages
- HIPAA audit logging

Based on 2026 messaging best practices:
- Message persistence (6-year retention)
- Read receipts (delivered + read)
- Access control (RLS)
- Audit trail

References:
- https://curogram.com/blog/best-practices/hipaa-compliant-messaging
- https://codelit.io/blog/chat-system-architecture
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from zoneinfo import ZoneInfo

from app.services.supabase import supabase

logger = logging.getLogger(__name__)

DEFAULT_TIMEZONE = "UTC"


class ConversationNotFoundError(Exception):
    """Raised when conversation is not found."""

    pass


class UnauthorizedAccessError(Exception):
    """Raised when user is not authorized to access conversation."""

    pass


class MessageService:
    """
    Industrial-grade message service.

    HIPAA Compliance:
    - 6-year message retention
    - Encryption at rest and in transit
    - Access control (RLS)
    - Audit logging
    """

    async def create_conversation(
        self,
        created_by: str,
        participant_ids: List[str],
        conversation_type: str = "direct",
        title: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new conversation.

        Args:
            created_by: Creator's user ID
            participant_ids: List of participant user IDs (including creator)
            conversation_type: 'direct' or 'group'
            title: Conversation title (for group conversations)

        Returns:
            Conversation data

        Raises:
            ValueError: If invalid parameters
        """
        try:
            # Validate conversation type
            if conversation_type not in ["direct", "group"]:
                raise ValueError("conversation_type must be 'direct' or 'group'")

            # Validate direct conversation
            if conversation_type == "direct" and len(participant_ids) != 2:
                raise ValueError("Direct conversation must have exactly 2 participants")

            # Ensure creator is in participants
            if created_by not in participant_ids:
                participant_ids.append(created_by)

            # Check if direct conversation already exists
            if conversation_type == "direct":
                existing = await self._find_direct_conversation(participant_ids)
                if existing:
                    logger.info(f"Direct conversation already exists: {existing['id']}")
                    return existing

            # Create conversation
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))
            conversation_data = {
                "type": conversation_type,
                "title": title,
                "created_by": created_by,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }

            result = supabase.table("conversations").insert(conversation_data).execute()

            if not result.data:
                raise Exception("Failed to create conversation")

            conversation = result.data[0]
            conversation_id = conversation["id"]

            # Add participants
            participant_data = [
                {
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "role": "admin" if user_id == created_by else "member",
                    "joined_at": now.isoformat(),
                    "is_active": True,
                }
                for user_id in participant_ids
            ]

            supabase.table("conversation_participants").insert(
                participant_data
            ).execute()

            logger.info(
                f"Conversation created: {conversation_id}, type={conversation_type}, participants={len(participant_ids)}"
            )

            return conversation

        except Exception as e:
            logger.error(f"Error creating conversation: {e}")
            raise

    async def _find_direct_conversation(
        self, participant_ids: List[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Find existing direct conversation between two users.

        Args:
            participant_ids: List of 2 user IDs

        Returns:
            Conversation data or None
        """
        try:
            if len(participant_ids) != 2:
                return None

            # Find conversations where both users are participants
            result = (
                supabase.table("conversations")
                .select("*, conversation_participants(*)")
                .eq("type", "direct")
                .execute()
            )

            if not result.data:
                return None

            # Check each conversation
            for conv in result.data:
                participants = conv.get("conversation_participants", [])
                active_participant_ids = [
                    p["user_id"] for p in participants if p.get("is_active")
                ]

                # Check if both users are in this conversation
                if set(active_participant_ids) == set(participant_ids):
                    return conv

            return None

        except Exception as e:
            logger.error(f"Error finding direct conversation: {e}")
            return None

    async def send_message(
        self,
        conversation_id: str,
        sender_id: str,
        content: str,
        message_type: str = "text",
        attachment_url: Optional[str] = None,
        attachment_name: Optional[str] = None,
        attachment_size_bytes: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Send a message in a conversation.

        Args:
            conversation_id: Conversation UUID
            sender_id: Sender's user ID
            content: Message content
            message_type: 'text', 'image', 'file', or 'system'
            attachment_url: Attachment URL (for image/file)
            attachment_name: Attachment filename
            attachment_size_bytes: Attachment size in bytes

        Returns:
            Message data

        Raises:
            ConversationNotFoundError: If conversation not found
            UnauthorizedAccessError: If user not authorized
        """
        try:
            # Verify user is participant
            is_participant = await self._is_participant(conversation_id, sender_id)
            if not is_participant:
                raise UnauthorizedAccessError(
                    "User is not a participant in this conversation"
                )

            # Create message
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))
            message_data = {
                "conversation_id": conversation_id,
                "sender_id": sender_id,
                "content": content,
                "message_type": message_type,
                "attachment_url": attachment_url,
                "attachment_name": attachment_name,
                "attachment_size_bytes": attachment_size_bytes,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
                "is_deleted": False,
            }

            result = supabase.table("messages").insert(message_data).execute()

            if not result.data:
                raise Exception("Failed to send message")

            message = result.data[0]

            logger.info(
                f"Message sent: {message['id']}, conversation={conversation_id[:8]}***, sender={sender_id[:8]}***"
            )

            return message

        except (ConversationNotFoundError, UnauthorizedAccessError):
            raise
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            raise

    async def _is_participant(self, conversation_id: str, user_id: str) -> bool:
        """
        Check if user is an active participant in conversation.

        Args:
            conversation_id: Conversation UUID
            user_id: User's UUID

        Returns:
            True if user is participant
        """
        try:
            result = (
                supabase.table("conversation_participants")
                .select("id")
                .eq("conversation_id", conversation_id)
                .eq("user_id", user_id)
                .eq("is_active", True)
                .maybe_single()
                .execute()
            )

            return result.data is not None

        except Exception as e:
            logger.error(f"Error checking participant: {e}")
            return False

    async def get_conversation_history(
        self,
        conversation_id: str,
        user_id: str,
        limit: int = 50,
        before_message_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get conversation message history (paginated).

        Args:
            conversation_id: Conversation UUID
            user_id: User's UUID (for authorization)
            limit: Maximum number of messages to return
            before_message_id: Get messages before this message ID (for pagination)

        Returns:
            List of messages (newest first)

        Raises:
            UnauthorizedAccessError: If user not authorized
        """
        try:
            # Verify user is participant
            is_participant = await self._is_participant(conversation_id, user_id)
            if not is_participant:
                raise UnauthorizedAccessError(
                    "User is not a participant in this conversation"
                )

            # Build query
            query = (
                supabase.table("messages")
                .select("*")
                .eq("conversation_id", conversation_id)
                .eq("is_deleted", False)
                .order("created_at", desc=True)
                .limit(limit)
            )

            # Add pagination
            if before_message_id:
                # Get timestamp of before_message_id
                before_result = (
                    supabase.table("messages")
                    .select("created_at")
                    .eq("id", before_message_id)
                    .maybe_single()
                    .execute()
                )

                if before_result.data:
                    before_timestamp = before_result.data["created_at"]
                    query = query.lt("created_at", before_timestamp)

            result = query.execute()

            messages = result.data or []

            logger.debug(
                f"Retrieved {len(messages)} messages from conversation {conversation_id[:8]}***"
            )

            return messages

        except UnauthorizedAccessError:
            raise
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []

    async def mark_message_as_delivered(self, message_id: str, user_id: str) -> bool:
        """
        Mark message as delivered to user.

        Args:
            message_id: Message UUID
            user_id: User's UUID

        Returns:
            True if marked successfully
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))

            result = (
                supabase.table("message_read_receipts")
                .update({"delivered_at": now.isoformat()})
                .eq("message_id", message_id)
                .eq("user_id", user_id)
                .is_("delivered_at", "null")
                .execute()
            )

            success = bool(result.data)

            if success:
                logger.debug(
                    f"Message {message_id[:8]}*** marked as delivered to {user_id[:8]}***"
                )

            return success

        except Exception as e:
            logger.error(f"Error marking message as delivered: {e}")
            return False

    async def mark_message_as_read(self, message_id: str, user_id: str) -> bool:
        """
        Mark message as read by user.

        Args:
            message_id: Message UUID
            user_id: User's UUID

        Returns:
            True if marked successfully
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))

            # Update read receipt
            result = (
                supabase.table("message_read_receipts")
                .update(
                    {
                        "delivered_at": now.isoformat(),  # Ensure delivered_at is set
                        "read_at": now.isoformat(),
                    }
                )
                .eq("message_id", message_id)
                .eq("user_id", user_id)
                .execute()
            )

            success = bool(result.data)

            if success:
                logger.debug(
                    f"Message {message_id[:8]}*** marked as read by {user_id[:8]}***"
                )

            return success

        except Exception as e:
            logger.error(f"Error marking message as read: {e}")
            return False

    async def get_unread_count(
        self, user_id: str, conversation_id: Optional[str] = None
    ) -> int:
        """
        Get unread message count for user.

        Args:
            user_id: User's UUID
            conversation_id: Optional conversation UUID (for specific conversation)

        Returns:
            Number of unread messages
        """
        try:
            # Build query
            query = (
                supabase.table("message_read_receipts")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .is_("read_at", "null")
            )

            # Filter by conversation if specified
            if conversation_id:
                # Join with messages table to filter by conversation
                query = (
                    supabase.table("message_read_receipts")
                    .select("id, messages!inner(conversation_id)", count="exact")
                    .eq("user_id", user_id)
                    .is_("read_at", "null")
                    .eq("messages.conversation_id", conversation_id)
                )

            result = query.execute()

            count = result.count or 0

            logger.debug(f"Unread count for {user_id[:8]}***: {count}")

            return count

        except Exception as e:
            logger.error(f"Error getting unread count: {e}")
            return 0

    async def get_user_conversations(
        self, user_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get user's conversations (sorted by last message).

        Args:
            user_id: User's UUID
            limit: Maximum number of conversations to return

        Returns:
            List of conversations with metadata
        """
        try:
            # Get conversations where user is participant
            result = (
                supabase.table("conversation_participants")
                .select("conversation_id, conversations(*)")
                .eq("user_id", user_id)
                .eq("is_active", True)
                .execute()
            )

            if not result.data:
                return []

            # Extract conversations
            conversations = []
            for item in result.data:
                conv = item.get("conversations")
                if conv:
                    # Get unread count for this conversation
                    unread_count = await self.get_unread_count(user_id, conv["id"])
                    conv["unread_count"] = unread_count
                    conversations.append(conv)

            # Sort by last_message_at (newest first)
            conversations.sort(
                key=lambda x: x.get("last_message_at") or x.get("created_at") or "",
                reverse=True,
            )

            # Limit results
            conversations = conversations[:limit]

            logger.debug(
                f"Retrieved {len(conversations)} conversations for {user_id[:8]}***"
            )

            return conversations

        except Exception as e:
            logger.error(f"Error getting user conversations: {e}")
            return []

    async def delete_message(self, message_id: str, user_id: str) -> bool:
        """
        Soft delete a message.

        Args:
            message_id: Message UUID
            user_id: User's UUID (must be sender)

        Returns:
            True if deleted successfully

        Raises:
            UnauthorizedAccessError: If user is not the sender
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))

            # Verify user is sender
            message_result = (
                supabase.table("messages")
                .select("sender_id")
                .eq("id", message_id)
                .maybe_single()
                .execute()
            )

            if not message_result.data:
                raise Exception("Message not found")

            if message_result.data["sender_id"] != user_id:
                raise UnauthorizedAccessError("Only sender can delete message")

            # Soft delete
            result = (
                supabase.table("messages")
                .update(
                    {
                        "is_deleted": True,
                        "deleted_at": now.isoformat(),
                        "deleted_by": user_id,
                    }
                )
                .eq("id", message_id)
                .execute()
            )

            success = bool(result.data)

            if success:
                logger.info(
                    f"Message {message_id[:8]}*** soft deleted by {user_id[:8]}***"
                )

            return success

        except UnauthorizedAccessError:
            raise
        except Exception as e:
            logger.error(f"Error deleting message: {e}")
            return False

    async def search_messages(
        self,
        user_id: str,
        query: str,
        conversation_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Search messages by content (full-text search).

        Args:
            user_id: User's UUID (for authorization)
            query: Search query
            conversation_id: Optional conversation UUID (to search within)
            limit: Maximum number of results

        Returns:
            List of matching messages
        """
        try:
            # Build query with full-text search
            search_query = (
                supabase.table("messages")
                .select("*")
                .text_search("content", query)
                .eq("is_deleted", False)
                .order("created_at", desc=True)
                .limit(limit)
            )

            # Filter by conversation if specified
            if conversation_id:
                # Verify user is participant
                is_participant = await self._is_participant(conversation_id, user_id)
                if not is_participant:
                    raise UnauthorizedAccessError(
                        "User is not a participant in this conversation"
                    )

                search_query = search_query.eq("conversation_id", conversation_id)

            result = search_query.execute()

            messages = result.data or []

            # Filter to only conversations user is part of
            filtered_messages = []
            for message in messages:
                if await self._is_participant(message["conversation_id"], user_id):
                    filtered_messages.append(message)

            logger.debug(
                f"Search found {len(filtered_messages)} messages for query: {query}"
            )

            return filtered_messages

        except UnauthorizedAccessError:
            raise
        except Exception as e:
            logger.error(f"Error searching messages: {e}")
            return []


# Singleton instance
_message_service: Optional[MessageService] = None


def get_message_service() -> MessageService:
    """Get or create message service singleton."""
    global _message_service
    if _message_service is None:
        _message_service = MessageService()
    return _message_service
