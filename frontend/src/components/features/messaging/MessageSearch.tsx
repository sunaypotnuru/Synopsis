/**
 * Message Search Component
 * 
 * Search interface for finding messages across conversations
 * Features:
 * - Full-text search
 * - Filter by conversation
 * - Filter by message type
 * - Filter by date range
 * - Highlight search matches
 */

import React, { useState } from 'react';
import { messagingAPI } from '@/services/api';
import type { MessageWithDetails } from '@/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Search, Calendar, Filter, X } from 'lucide-react';
import { format } from 'date-fns';

interface MessageSearchProps {
  conversationId?: string;
  onSelectMessage?: (message: MessageWithDetails) => void;
  onClose?: () => void;
}

export function MessageSearch({
  conversationId,
  onSelectMessage,
  onClose,
}: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MessageWithDetails[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [messageType, setMessageType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  /**
   * Perform search
   */
  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await messagingAPI.searchMessages({
        query: query.trim(),
        conversation_id: conversationId,
        message_type: (messageType as 'text' | 'file' | 'image' | 'system' | 'voice') || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        limit: 50,
      });

      setResults(response.results);
    } catch (err) {
      console.error('Failed to search messages:', err);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Clear search
   */
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setMessageType('');
    setStartDate('');
    setEndDate('');
    setHasSearched(false);
  };

  /**
   * Highlight search matches
   */
  const highlightMatches = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Search Messages
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for messages..."
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={!query.trim() || isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
          {hasSearched && (
            <Button onClick={handleClear} variant="outline">
              Clear
            </Button>
          )}
        </div>

        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 mt-3"
        >
          <Filter className="w-4 h-4" />
          <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
        </button>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg">
            {/* Message Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Type
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="file">File</option>
                <option value="voice">Voice</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {isSearching ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Search className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm text-center">
              Enter a search query to find messages
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Search className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm text-center">
              No messages found matching "{query}"
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Found {results.length} message{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((message) => (
              <Card
                key={message.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelectMessage?.(message)}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {message.sender.name.charAt(0)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {message.sender.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(message.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {highlightMatches(message.content, query)}
                    </p>
                    {message.message_type !== 'text' && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        {message.message_type}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
