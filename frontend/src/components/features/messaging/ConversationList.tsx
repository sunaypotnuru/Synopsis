/**
 * Conversation List Component
 * 
 * Sidebar showing all conversations with:
 * - Unread count badges
 * - Last message preview
 * - Search functionality
 * - Filter by type
 * - Real-time updates
 */

import React, { useEffect, useState } from 'react';
import { messagingAPI } from '@/services/api';
import { getWebSocketManager } from '@/services/websocket';
import type { ConversationWithDetails } from '@/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Search, MessageSquare, Users, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface ConversationListProps {
  currentUserId: string;
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation?: () => void;
}

export function ConversationList({
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ConversationWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'group'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    loadConversations();
    connectWebSocket();
    return () => cleanup();
  }, []);

  useEffect(() => {
    filterConversations();
  }, [conversations, searchQuery, filterType, unreadOnly]);

  /**
   * Load conversations
   */
  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await messagingAPI.getConversations({
        limit: 100,
      });
      setConversations(response.conversations);
      
      // Calculate total unread
      const unread = response.conversations.reduce(
        (sum, conv) => sum + conv.unread_count,
        0
      );
      setTotalUnread(unread);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Connect to WebSocket for real-time updates
   */
  const connectWebSocket = async () => {
    const wsManager = getWebSocketManager();
    
    // Connect to each conversation for updates
    conversations.forEach(async (conv) => {
      const ws = await wsManager.connect(`messaging/${conv.id}`);
      
      ws.on('message:new', () => {
        loadConversations(); // Refresh to update last message and unread count
      });
    });
  };

  /**
   * Cleanup
   */
  const cleanup = () => {
    const wsManager = getWebSocketManager();
    conversations.forEach((conv) => {
      wsManager.disconnect(`messaging/${conv.id}`);
    });
  };

  /**
   * Filter conversations
   */
  const filterConversations = () => {
    let filtered = [...conversations];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((conv) => {
        const title = conv.title?.toLowerCase() || '';
        const lastMessage = conv.last_message?.content.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return title.includes(query) || lastMessage.includes(query);
      });
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((conv) => conv.type === filterType);
    }

    // Filter by unread
    if (unreadOnly) {
      filtered = filtered.filter((conv) => conv.unread_count > 0);
    }

    // Sort by last message time
    filtered.sort((a, b) => {
      const aTime = a.last_message_at || a.created_at;
      const bTime = b.last_message_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setFilteredConversations(filtered);
  };

  /**
   * Get conversation title
   */
  const getConversationTitle = (conversation: ConversationWithDetails) => {
    if (conversation.title) return conversation.title;
    
    // For direct conversations, show other participant's name
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        (p) => p.user_id !== currentUserId
      );
      return otherParticipant ? 'Direct Message' : 'Conversation';
    }
    
    return 'Group Chat';
  };

  /**
   * Format last message time
   */
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 168) {
      return format(date, 'EEE');
    } else {
      return format(date, 'MMM d');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Messages</h2>
          {onNewConversation && (
            <Button onClick={onNewConversation} size="sm">
              New
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 mt-3">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            All
          </Button>
          <Button
            variant={filterType === 'direct' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('direct')}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Direct
          </Button>
          <Button
            variant={filterType === 'group' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('group')}
          >
            <Users className="w-4 h-4 mr-1" />
            Groups
          </Button>
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            <Filter className="w-4 h-4 mr-1" />
            Unread ({totalUnread})
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm text-center">
              {searchQuery
                ? 'No conversations found'
                : 'No conversations yet'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                selectedConversationId === conversation.id
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                    {conversation.type === 'group' ? (
                      <Users className="w-6 h-6" />
                    ) : (
                      <MessageSquare className="w-6 h-6" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {getConversationTitle(conversation)}
                    </h3>
                    {conversation.last_message_at && (
                      <span className="text-xs text-gray-500 ml-2">
                        {formatTime(conversation.last_message_at)}
                      </span>
                    )}
                  </div>

                  {/* Last Message */}
                  {conversation.last_message && (
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.last_message.content || 'Attachment'}
                    </p>
                  )}

                  {/* Unread Badge */}
                  {conversation.unread_count > 0 && (
                    <div className="mt-1">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                        {conversation.unread_count}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
