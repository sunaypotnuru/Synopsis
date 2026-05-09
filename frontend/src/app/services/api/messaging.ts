/**
 * Messaging API Client
 * 
 * Provides methods to interact with messaging endpoints
 */

import { apiClient } from '../apiClient';
import type {
  Conversation,
  ConversationWithDetails,
  CreateConversationRequest,
  ConversationListResponse,
  Message,
  MessageWithDetails,
  SendMessageRequest,
  UpdateMessageRequest,
  SearchMessagesRequest,
  MessageListResponse,
  SearchMessagesResponse,
  ReadReceipt,
  MarkAsReadRequest,
  ReadReceiptStatus,
  TypingStatus,
  MessageReaction,
  AddReactionRequest,
  ReactionSummary,
} from '../../types';

const BASE_PATH = '/api/v1/messaging';

// ============================================================================
// Conversation Management
// ============================================================================

/**
 * Get all conversations for current user
 */
export async function getConversations(params?: {
  limit?: number;
  offset?: number;
  type?: 'direct' | 'group';
  unread_only?: boolean;
}): Promise<ConversationListResponse> {
  const response = await apiClient.get<ConversationListResponse>(
    `${BASE_PATH}/conversations`,
    { params }
  );
  return response.data;
}

/**
 * Get conversation by ID
 */
export async function getConversation(
  conversationId: string
): Promise<ConversationWithDetails> {
  const response = await apiClient.get<ConversationWithDetails>(
    `${BASE_PATH}/conversations/${conversationId}`
  );
  return response.data;
}

/**
 * Create new conversation
 */
export async function createConversation(
  data: CreateConversationRequest
): Promise<ConversationWithDetails> {
  const response = await apiClient.post<ConversationWithDetails>(
    `${BASE_PATH}/conversations`,
    data
  );
  return response.data;
}

/**
 * Update conversation
 */
export async function updateConversation(
  conversationId: string,
  data: { title?: string }
): Promise<Conversation> {
  const response = await apiClient.patch<Conversation>(
    `${BASE_PATH}/conversations/${conversationId}`,
    data
  );
  return response.data;
}

/**
 * Delete conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/conversations/${conversationId}`);
}

/**
 * Add participant to conversation
 */
export async function addParticipant(
  conversationId: string,
  userId: string
): Promise<void> {
  await apiClient.post(
    `${BASE_PATH}/conversations/${conversationId}/participants`,
    { user_id: userId }
  );
}

/**
 * Remove participant from conversation
 */
export async function removeParticipant(
  conversationId: string,
  userId: string
): Promise<void> {
  await apiClient.delete(
    `${BASE_PATH}/conversations/${conversationId}/participants/${userId}`
  );
}

/**
 * Mute conversation
 */
export async function muteConversation(
  conversationId: string,
  muted: boolean
): Promise<void> {
  await apiClient.patch(
    `${BASE_PATH}/conversations/${conversationId}/mute`,
    { muted }
  );
}

/**
 * Archive conversation
 */
export async function archiveConversation(
  conversationId: string,
  archived: boolean
): Promise<void> {
  await apiClient.patch(
    `${BASE_PATH}/conversations/${conversationId}/archive`,
    { archived }
  );
}

// ============================================================================
// Message Management
// ============================================================================

/**
 * Get messages in conversation
 */
export async function getMessages(
  conversationId: string,
  params?: {
    limit?: number;
    offset?: number;
    before?: string;
    after?: string;
  }
): Promise<MessageListResponse> {
  const response = await apiClient.get<MessageListResponse>(
    `${BASE_PATH}/conversations/${conversationId}/messages`,
    { params }
  );
  return response.data;
}

/**
 * Get message by ID
 */
export async function getMessage(
  conversationId: string,
  messageId: string
): Promise<MessageWithDetails> {
  const response = await apiClient.get<MessageWithDetails>(
    `${BASE_PATH}/conversations/${conversationId}/messages/${messageId}`
  );
  return response.data;
}

/**
 * Send message
 */
export async function sendMessage(
  conversationId: string,
  data: SendMessageRequest
): Promise<MessageWithDetails> {
  const response = await apiClient.post<MessageWithDetails>(
    `${BASE_PATH}/conversations/${conversationId}/messages`,
    data
  );
  return response.data;
}

/**
 * Update message
 */
export async function updateMessage(
  conversationId: string,
  messageId: string,
  data: UpdateMessageRequest
): Promise<Message> {
  const response = await apiClient.patch<Message>(
    `${BASE_PATH}/conversations/${conversationId}/messages/${messageId}`,
    data
  );
  return response.data;
}

/**
 * Delete message
 */
export async function deleteMessage(
  conversationId: string,
  messageId: string
): Promise<void> {
  await apiClient.delete(
    `${BASE_PATH}/conversations/${conversationId}/messages/${messageId}`
  );
}

/**
 * Search messages
 */
export async function searchMessages(
  data: SearchMessagesRequest
): Promise<SearchMessagesResponse> {
  const response = await apiClient.post<SearchMessagesResponse>(
    `${BASE_PATH}/messages/search`,
    data
  );
  return response.data;
}

// ============================================================================
// Read Receipts
// ============================================================================

/**
 * Mark messages as read
 */
export async function markAsRead(
  conversationId: string,
  data: MarkAsReadRequest
): Promise<void> {
  await apiClient.post(
    `${BASE_PATH}/conversations/${conversationId}/read`,
    data
  );
}

/**
 * Get read receipts for message
 */
export async function getReadReceipts(
  conversationId: string,
  messageId: string
): Promise<ReadReceiptStatus> {
  const response = await apiClient.get<ReadReceiptStatus>(
    `${BASE_PATH}/conversations/${conversationId}/messages/${messageId}/receipts`
  );
  return response.data;
}

/**
 * Get unread count for conversation
 */
export async function getUnreadCount(
  conversationId: string
): Promise<{ count: number }> {
  const response = await apiClient.get<{ count: number }>(
    `${BASE_PATH}/conversations/${conversationId}/unread`
  );
  return response.data;
}

/**
 * Get total unread count for user
 */
export async function getTotalUnreadCount(): Promise<{ count: number }> {
  const response = await apiClient.get<{ count: number }>(
    `${BASE_PATH}/unread`
  );
  return response.data;
}

// ============================================================================
// Typing Indicators
// ============================================================================

/**
 * Send typing indicator
 */
export async function sendTypingIndicator(
  conversationId: string,
  isTyping: boolean
): Promise<void> {
  await apiClient.post(
    `${BASE_PATH}/conversations/${conversationId}/typing`,
    { is_typing: isTyping }
  );
}

/**
 * Get typing status
 */
export async function getTypingStatus(
  conversationId: string
): Promise<TypingStatus> {
  const response = await apiClient.get<TypingStatus>(
    `${BASE_PATH}/conversations/${conversationId}/typing`
  );
  return response.data;
}

// ============================================================================
// Message Reactions
// ============================================================================

/**
 * Add reaction to message
 */
export async function addReaction(
  conversationId: string,
  messageId: string,
  data: AddReactionRequest
): Promise<MessageReaction> {
  const response = await apiClient.post<MessageReaction>(
    `${BASE_PATH}/conversations/${conversationId}/messages/${messageId}/reactions`,
    data
  );
  return response.data;
}

/**
 * Remove reaction from message
 */
export async function removeReaction(
  conversationId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  await apiClient.delete(
    `${BASE_PATH}/conversations/${conversationId}/messages/${messageId}/reactions/${emoji}`
  );
}

/**
 * Get reactions for message
 */
export async function getReactions(
  conversationId: string,
  messageId: string
): Promise<ReactionSummary> {
  const response = await apiClient.get<ReactionSummary>(
    `${BASE_PATH}/conversations/${conversationId}/messages/${messageId}/reactions`
  );
  return response.data;
}

// ============================================================================
// File Attachments
// ============================================================================

/**
 * Upload attachment
 */
export async function uploadAttachment(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ url: string; type: string; size: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<{ url: string; type: string; size: number }>(
    `${BASE_PATH}/attachments/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(progress);
        }
      },
    }
  );
  return response.data;
}

/**
 * Delete attachment
 */
export async function deleteAttachment(url: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/attachments`, {
    params: { url },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get or create direct conversation with user
 */
export async function getOrCreateDirectConversation(
  userId: string
): Promise<ConversationWithDetails> {
  const response = await apiClient.post<ConversationWithDetails>(
    `${BASE_PATH}/conversations/direct`,
    { user_id: userId }
  );
  return response.data;
}

/**
 * Check if user is online
 */
export async function checkUserOnline(
  userId: string
): Promise<{ online: boolean; last_seen?: string }> {
  const response = await apiClient.get<{ online: boolean; last_seen?: string }>(
    `${BASE_PATH}/users/${userId}/online`
  );
  return response.data;
}
