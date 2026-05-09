"""
Context Manager
Manages conversation context, token budgets, and memory for AI interactions
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class ContextManager:
    """Manages conversation context and token budgets"""

    # Context window sizes by model
    CONTEXT_WINDOWS = {
        "gpt-3.5-turbo": 4096,
        "gpt-3.5-turbo-16k": 16384,
        "gpt-4": 8192,
        "gpt-4-32k": 32768,
        "gpt-4-turbo": 128000,
        "claude-2": 100000,
        "claude-3": 200000,
        "local-7b": 4096,
        "local-13b": 8192,
        "default": 4096,
    }

    # Reserve tokens for response
    RESPONSE_RESERVE = 1000

    def __init__(self, model_name: str = "default"):
        """
        Initialize context manager

        Args:
            model_name: Model name to determine context window
        """
        self.model_name = model_name
        self.context_window = self.CONTEXT_WINDOWS.get(
            model_name, self.CONTEXT_WINDOWS["default"]
        )
        self.max_input_tokens = self.context_window - self.RESPONSE_RESERVE

        # Conversation history
        self.messages: List[Dict[str, Any]] = []
        self.total_tokens = 0

    def get_context_window(self) -> int:
        """Get context window size for current model"""
        return self.context_window

    def get_available_tokens(self) -> int:
        """Get available tokens for new input"""
        return max(0, self.max_input_tokens - self.total_tokens)

    def estimate_tokens(self, text: str) -> int:
        """
        Estimate token count for text

        Args:
            text: Text to estimate

        Returns:
            Estimated token count
        """
        # Simple estimation: ~4 characters per token
        # For production, use tiktoken library for accurate counting
        return len(text) // 4

    def add_message(
        self, role: str, content: str, metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Add message to conversation history

        Args:
            role: Message role (system, user, assistant)
            content: Message content
            metadata: Optional metadata

        Returns:
            True if added successfully
        """
        try:
            tokens = self.estimate_tokens(content)

            # Check if we have space
            if self.total_tokens + tokens > self.max_input_tokens:
                logger.warning("Context window full. Attempting to prune.")
                self._prune_context(tokens)

            # Add message
            message = {
                "role": role,
                "content": content,
                "tokens": tokens,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": metadata or {},
            }

            self.messages.append(message)
            self.total_tokens += tokens

            return True

        except Exception as e:
            logger.error(f"Error adding message: {str(e)}")
            return False

    def _prune_context(self, needed_tokens: int):
        """
        Prune context to make room for new message

        Args:
            needed_tokens: Tokens needed for new message
        """
        if not self.messages:
            return

        # Strategy: Remove oldest messages (except system message)
        # Keep system message (first message) if present
        system_message = None
        if self.messages and self.messages[0]["role"] == "system":
            system_message = self.messages[0]
            messages_to_prune = self.messages[1:]
        else:
            messages_to_prune = self.messages

        # Calculate how many tokens to free
        tokens_to_free = (self.total_tokens + needed_tokens) - self.max_input_tokens

        # Remove messages until we have enough space
        freed_tokens = 0
        pruned_count = 0

        while freed_tokens < tokens_to_free and messages_to_prune:
            removed = messages_to_prune.pop(0)
            freed_tokens += removed["tokens"]
            pruned_count += 1

        # Rebuild messages list
        if system_message:
            self.messages = [system_message] + messages_to_prune
        else:
            self.messages = messages_to_prune

        # Update total tokens
        self.total_tokens = sum(m["tokens"] for m in self.messages)

        logger.info(f"Pruned {pruned_count} messages, freed {freed_tokens} tokens")

    def get_messages_for_api(self) -> List[Dict[str, str]]:
        """
        Get messages formatted for API call

        Returns:
            List of messages in API format
        """
        return [{"role": m["role"], "content": m["content"]} for m in self.messages]

    def summarize_conversation(self) -> str:
        """
        Generate a summary of the conversation

        Returns:
            Summary text
        """
        if not self.messages:
            return "No conversation history"

        # Simple summary: first and last few messages
        summary_parts = []

        # First message (usually system or initial user message)
        if self.messages:
            first = self.messages[0]
            summary_parts.append(f"Started with: {first['content'][:100]}...")

        # Last few messages
        recent_messages = self.messages[-3:]
        for msg in recent_messages:
            role = msg["role"].capitalize()
            content = msg["content"][:100]
            summary_parts.append(f"{role}: {content}...")

        return "\n".join(summary_parts)

    def compress_context(self) -> bool:
        """
        Compress context by summarizing older messages

        Returns:
            True if compressed successfully
        """
        try:
            if len(self.messages) < 5:
                return False  # Not enough messages to compress

            # Keep system message and last 2 messages
            system_message = None
            if self.messages and self.messages[0]["role"] == "system":
                system_message = self.messages[0]
                middle_messages = self.messages[1:-2]
                recent_messages = self.messages[-2:]
            else:
                middle_messages = self.messages[:-2]
                recent_messages = self.messages[-2:]

            if not middle_messages:
                return False

            # Create summary of middle messages
            summary_content = "Previous conversation summary:\n"
            for msg in middle_messages:
                summary_content += f"- {msg['role']}: {msg['content'][:50]}...\n"

            summary_tokens = self.estimate_tokens(summary_content)

            # Create compressed message list
            compressed = []
            if system_message:
                compressed.append(system_message)

            compressed.append(
                {
                    "role": "system",
                    "content": summary_content,
                    "tokens": summary_tokens,
                    "timestamp": datetime.utcnow().isoformat(),
                    "metadata": {"compressed": True},
                }
            )

            compressed.extend(recent_messages)

            # Update messages and tokens
            self.messages = compressed
            self.total_tokens = sum(m["tokens"] for m in self.messages)

            logger.info(
                f"Compressed context: {len(middle_messages)} messages -> 1 summary"
            )

            return True

        except Exception as e:
            logger.error(f"Error compressing context: {str(e)}")
            return False

    def clear_context(self, keep_system: bool = True):
        """
        Clear conversation context

        Args:
            keep_system: Whether to keep system message
        """
        if keep_system and self.messages and self.messages[0]["role"] == "system":
            system_message = self.messages[0]
            self.messages = [system_message]
            self.total_tokens = system_message["tokens"]
        else:
            self.messages = []
            self.total_tokens = 0

        logger.info("Context cleared")

    def get_context_stats(self) -> Dict[str, Any]:
        """
        Get context statistics

        Returns:
            Dictionary with context stats
        """
        return {
            "model": self.model_name,
            "context_window": self.context_window,
            "max_input_tokens": self.max_input_tokens,
            "total_tokens": self.total_tokens,
            "available_tokens": self.get_available_tokens(),
            "usage_percent": round(
                (self.total_tokens / self.max_input_tokens) * 100, 1
            ),
            "message_count": len(self.messages),
            "oldest_message": self.messages[0]["timestamp"] if self.messages else None,
            "newest_message": self.messages[-1]["timestamp"] if self.messages else None,
        }

    def should_compress(self, threshold: float = 0.8) -> bool:
        """
        Check if context should be compressed

        Args:
            threshold: Usage threshold (0.0-1.0)

        Returns:
            True if should compress
        """
        usage = self.total_tokens / self.max_input_tokens
        return usage >= threshold

    def export_context(self) -> str:
        """
        Export context as JSON

        Returns:
            JSON string of context
        """
        return json.dumps(
            {
                "model": self.model_name,
                "messages": self.messages,
                "total_tokens": self.total_tokens,
                "exported_at": datetime.utcnow().isoformat(),
            },
            indent=2,
        )

    def import_context(self, context_json: str) -> bool:
        """
        Import context from JSON

        Args:
            context_json: JSON string of context

        Returns:
            True if imported successfully
        """
        try:
            data = json.loads(context_json)

            self.model_name = data.get("model", self.model_name)
            self.messages = data.get("messages", [])
            self.total_tokens = data.get("total_tokens", 0)

            # Recalculate context window
            self.context_window = self.CONTEXT_WINDOWS.get(
                self.model_name, self.CONTEXT_WINDOWS["default"]
            )
            self.max_input_tokens = self.context_window - self.RESPONSE_RESERVE

            logger.info(f"Imported context with {len(self.messages)} messages")

            return True

        except Exception as e:
            logger.error(f"Error importing context: {str(e)}")
            return False


class ConversationMemory:
    """Manages long-term conversation memory"""

    def __init__(self):
        """Initialize conversation memory"""
        self.short_term: List[Dict[str, Any]] = []  # Current conversation
        self.long_term: Dict[str, Any] = {}  # User preferences, facts
        self.working: Dict[str, Any] = {}  # Current task context

    def add_to_short_term(self, message: Dict[str, Any]):
        """Add message to short-term memory"""
        self.short_term.append(message)

        # Keep only last 10 messages in short-term
        if len(self.short_term) > 10:
            self.short_term.pop(0)

    def add_to_long_term(self, key: str, value: Any):
        """Add fact to long-term memory"""
        self.long_term[key] = {
            "value": value,
            "added_at": datetime.utcnow().isoformat(),
        }

    def get_from_long_term(self, key: str) -> Optional[Any]:
        """Get fact from long-term memory"""
        item = self.long_term.get(key)
        return item["value"] if item else None

    def set_working_context(self, key: str, value: Any):
        """Set working context for current task"""
        self.working[key] = value

    def get_working_context(self, key: str) -> Optional[Any]:
        """Get working context"""
        return self.working.get(key)

    def clear_working_context(self):
        """Clear working context"""
        self.working = {}

    def get_memory_summary(self) -> Dict[str, Any]:
        """Get summary of all memory"""
        return {
            "short_term_count": len(self.short_term),
            "long_term_count": len(self.long_term),
            "working_context_count": len(self.working),
        }


# Helper functions
def get_context_manager(model_name: str = "default") -> ContextManager:
    """Get context manager instance"""
    return ContextManager(model_name)


def get_conversation_memory() -> ConversationMemory:
    """Get conversation memory instance"""
    return ConversationMemory()
