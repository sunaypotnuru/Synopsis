/**
 * Message Interface Component
 * 
 * Main chat interface with real-time messaging
 * Features:
 * - Real-time message updates via WebSocket
 * - Infinite scroll for message history
 * - Typing indicators
 * - Read receipts
 * - File attachments
 * - Message reactions
 * - Reply functionality
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { messagingAPI } from '@/services/api';
import { getWebSocketManager } from '@/services/websocket';
import type { ConversationWithDetails, MessageWithDetails } from '@/types';
import MessageBubble from '@/components/features/messaging/MessageBubble';
import MessageInput from '@/components/features/messaging/MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card } from '@/components/ui/card';
import { AlertCircle, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageInterfaceProps {
  conversationId: string;
  currentUserId: string;
  onBack?: () => void;
}

export function MessageInterface({
  conversationId,
  currentUserId,
  onBack,
}: MessageInterfaceProps) {
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [replyTo, setReplyTo] = useState<MessageWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);

  /**
   * Initialize conversation
   */
  useEffect(() => {
    loadConversation();
    loadMessages();
    connectWebSocket();
    return () => cleanup();
  }, [conversationId]);

  /**
   * Auto-scroll to bottom on new messages
   */
  useEffect(() => {
    if (messages.length > 0 && !showScrollButton) {
      scrollToBottom();
    }
  }, [messages]);

  /**
   * Handle scroll to show/hide scroll button
   */
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  /**
   * Load conversation details
   */
  const loadConversation = async () => {
    try {
      const data = await messagingAPI.getConversation(conversationId);
      setConversation(data);
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
    }
  };

  /**
   * Load messages
   */
  const loadMessages = async (before?: string) => {
    try {
      if (before) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const response = await messagingAPI.getMessages(conversationId, {
        limit: 50,
        before,
      });

      if (before) {
        setMessages((prev) => [...response.messages, ...prev]);
      } else {
        setMessages(response.messages);
      }

      setHasMore(response.has_more);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  /**
   * Connect to WebSocket for real-time updates
   */
  const connectWebSocket = async () => {
    const wsManager = getWebSocketManager();
    const ws = await wsManager.connect(`messaging/${conversationId}`);

    // Handle new messages
    ws.on('message:new', (message: MessageWithDetails) => {
      setMessages((prev) => [...prev, message]);
      
      // Mark as read if not own message
      if (message.sender_id !== currentUserId) {
        markAsRead([message.id]);
      }
    });

    // Handle message updates
    ws.on('message:updated', (message: MessageWithDetails) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    });

    // Handle message deletions
    ws.on('message:deleted', ({ message_id }: { message_id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== message_id));
    });

    // Handle typing indicators
    ws.on('typing:start', ({ user_id, user_name }: { user_id: string; user_name: string }) => {
      if (user_id !== currentUserId) {
        setTypingUsers((prev) => [...new Set([...prev, user_name])]);
      }
    });

    ws.on('typing:stop', ({ user_id }: { user_id: string }) => {
      if (user_id !== currentUserId) {
        setTypingUsers((prev) => prev.filter((name) => name !== user_id));
      }
    });

    // Handle read receipts
    ws.on('read_receipt:new', () => {
      // Refresh messages to update read status
      loadMessages();
    });
  };

  /**
   * Cleanup
   */
  const cleanup = () => {
    const wsManager = getWebSocketManager();
    wsManager.disconnect(`messaging/${conversationId}`);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  /**
   * Send message
   */
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    try {
      // Stop typing indicator
      sendTypingIndicator(false);

      // Send message
      await messagingAPI.sendMessage(conversationId, {
        content: messageInput,
        message_type: 'text',
        reply_to_id: replyTo?.id,
      });

      // Clear input
      setMessageInput('');
      setReplyTo(null);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    }
  };

  /**
   * Handle file upload
   */
  const handleFileUpload = async (file: File) => {
    try {
      // Upload file
      const { url, type, size } = await messagingAPI.uploadAttachment(file);

      // Send message with attachment
      await messagingAPI.sendMessage(conversationId, {
        content: '',
        message_type: type.startsWith('image/') ? 'image' : 'file',
        attachment_url: url,
        attachment_type: type,
        attachment_size: size,
      });
    } catch (err) {
      console.error('Failed to upload file:', err);
      setError('Failed to upload file');
    }
  };

  /**
   * Handle message input change
   */
  const handleInputChange = (value: string) => {
    setMessageInput(value);

    // Send typing indicator
    if (!isTyping && value.trim()) {
      sendTypingIndicator(true);
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
      setIsTyping(false);
    }, 3000);
  };

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = async (typing: boolean) => {
    try {
      await messagingAPI.sendTypingIndicator(conversationId, typing);
    } catch (err) {
      console.error('Failed to send typing indicator:', err);
    }
  };

  /**
   * Mark messages as read
   */
  const markAsRead = async (messageIds: string[]) => {
    try {
      await messagingAPI.markAsRead(conversationId, { message_ids: messageIds });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  /**
   * Handle reply
   */
  const handleReply = (message: MessageWithDetails) => {
    setReplyTo(message);
  };

  /**
   * Handle reaction
   */
  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await messagingAPI.addReaction(conversationId, messageId, { emoji });
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
  };

  /**
   * Handle image click
   */
  const handleImageClick = (url: string) => {
    window.open(url, '_blank');
  };

  /**
   * Scroll to bottom
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Load more messages (infinite scroll)
   */
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && messages.length > 0) {
      const oldestMessage = messages[0];
      loadMessages(oldestMessage.created_at);
    }
  }, [isLoadingMore, hasMore, messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="p-6 max-w-md">
          <div className="flex items-center space-x-3 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Error</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {conversation?.title || 'Conversation'}
            </h2>
            <p className="text-sm text-gray-500">
              {conversation?.participants.length} participants
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center">
            <Button
              onClick={handleLoadMore}
              variant="outline"
              size="sm"
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}

        {/* Messages List */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={{
              ...message,
              read: message.read_count > 0,
            } as any}
            isOwn={message.sender_id === currentUserId}
            senderName={message.sender.name}
            onReply={handleReply as any}
            onReact={handleReact}
            onImageClick={handleImageClick}
          />
        ))}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-8 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
        >
          <ArrowDown className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Message Input */}
      <MessageInput
        value={messageInput}
        onChange={handleInputChange}
        onSend={handleSendMessage}
        onFileUpload={handleFileUpload}
        replyTo={replyTo ? {
          id: replyTo.id,
          content: replyTo.content,
          sender_name: replyTo.sender.name,
        } : undefined}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
