/**
 * Messaging Types
 * 
 * Type definitions for real-time messaging features including:
 * - Conversations
 * - Messages
 * - Read receipts
 * - Typing indicators
 * - Message search
 */

// ============================================================================
// Conversation
// ============================================================================

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at: string | null;
  is_muted: boolean;
  is_archived: boolean;
}

export interface ConversationWithDetails extends Conversation {
  participants: ConversationParticipant[];
  unread_count: number;
  last_message: Message | null;
}

export interface CreateConversationRequest {
  type: 'direct' | 'group';
  title?: string;
  participant_ids: string[];
}

// ============================================================================
// Message
// ============================================================================

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'voice' | 'system';
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  reply_to_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageWithDetails extends Message {
  sender: {
    id: string;
    name: string;
    avatar_url: string | null;
    role: string;
  };
  reply_to: Message | null;
  read_by: string[];
  read_count: number;
}

export interface SendMessageRequest {
  content: string;
  message_type?: Message['message_type'];
  attachment_url?: string;
  attachment_type?: string;
  attachment_size?: number;
  reply_to_id?: string;
}

export interface UpdateMessageRequest {
  content: string;
}

export interface SearchMessagesRequest {
  query: string;
  conversation_id?: string;
  message_type?: Message['message_type'];
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Read Receipt
// ============================================================================

export interface ReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
  created_at: string;
}

export interface MarkAsReadRequest {
  message_ids: string[];
}

export interface ReadReceiptStatus {
  message_id: string;
  total_participants: number;
  read_count: number;
  unread_count: number;
  read_by: Array<{
    user_id: string;
    user_name: string;
    read_at: string;
  }>;
}

// ============================================================================
// Typing Indicator
// ============================================================================

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  user_name: string;
  is_typing: boolean;
  timestamp: string;
}

export interface TypingStatus {
  conversation_id: string;
  typing_users: Array<{
    user_id: string;
    user_name: string;
  }>;
}

// ============================================================================
// Message Reactions
// ============================================================================

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface AddReactionRequest {
  emoji: string;
}

export interface ReactionSummary {
  message_id: string;
  reactions: Array<{
    emoji: string;
    count: number;
    users: Array<{
      user_id: string;
      user_name: string;
    }>;
  }>;
}

// ============================================================================
// WebSocket Events
// ============================================================================

export interface MessagingWebSocketEvents {
  // Message events
  'message:new': MessageWithDetails;
  'message:updated': MessageWithDetails;
  'message:deleted': { message_id: string; conversation_id: string };

  // Typing events
  'typing:start': TypingIndicator;
  'typing:stop': TypingIndicator;

  // Read receipt events
  'read_receipt:new': ReadReceipt;
  'read_receipt:bulk': { message_ids: string[]; user_id: string };

  // Conversation events
  'conversation:updated': Conversation;
  'conversation:participant_added': { conversation_id: string; participant: ConversationParticipant };
  'conversation:participant_removed': { conversation_id: string; user_id: string };

  // Reaction events
  'reaction:added': MessageReaction;
  'reaction:removed': { message_id: string; user_id: string; emoji: string };

  // Connection events
  'connection:status': { status: 'connected' | 'disconnected' | 'reconnecting' };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ConversationListResponse {
  conversations: ConversationWithDetails[];
  total: number;
  has_more: boolean;
}

export interface MessageListResponse {
  messages: MessageWithDetails[];
  total: number;
  has_more: boolean;
}

export interface SearchMessagesResponse {
  results: MessageWithDetails[];
  total: number;
  has_more: boolean;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface MessagingState {
  conversations: ConversationWithDetails[];
  activeConversation: ConversationWithDetails | null;
  messages: Record<string, MessageWithDetails[]>;
  typingUsers: Record<string, TypingIndicator[]>;
  unreadCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
}

export interface MessageInputState {
  content: string;
  replyTo: Message | null;
  attachments: File[];
  isTyping: boolean;
  isSending: boolean;
}

export interface ConversationFilters {
  search: string;
  type: 'all' | 'direct' | 'group';
  unread_only: boolean;
  archived: boolean;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface MessageNotification {
  id: string;
  conversation_id: string;
  message_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
  is_read: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  sound_enabled: boolean;
  desktop_notifications: boolean;
  muted_conversations: string[];
}
