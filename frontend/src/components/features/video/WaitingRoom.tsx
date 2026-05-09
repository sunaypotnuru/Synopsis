/**
 * Waiting Room Component
 * 
 * Queue management interface for patients waiting for video consultation
 * Features:
 * - Real-time queue position
 * - Estimated wait time
 * - Priority indicator
 * - Leave queue option
 */

import React, { useEffect, useState } from 'react';
import { videoAPI } from '@/services/api';
import { getWebSocketManager } from '@/services/websocket';
import type { WaitingRoomEntry } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface WaitingRoomProps {
  consultationId: string;
  onReady?: () => void;
  onLeave?: () => void;
}

export function WaitingRoom({
  consultationId,
  onReady,
  onLeave,
}: WaitingRoomProps) {
  const [entry, setEntry] = useState<WaitingRoomEntry | null>(null);
  const [position, setPosition] = useState<number>(0);
  const [estimatedWait, setEstimatedWait] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    joinWaitingRoom();
    return () => cleanup();
  }, [consultationId]);

  /**
   * Join waiting room
   */
  const joinWaitingRoom = async () => {
    try {
      setIsLoading(true);

      // Join waiting room
      const response = await videoAPI.joinWaitingRoom({
        consultation_id: consultationId,
        priority: 'normal',
      });

      setEntry(response.entry);
      setPosition(response.position);
      setEstimatedWait(response.estimated_wait_minutes);

      // Connect to WebSocket for updates
      await connectWebSocket();

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to join waiting room:', err);
      setError('Failed to join waiting room. Please try again.');
      setIsLoading(false);
    }
  };

  /**
   * Connect to WebSocket for real-time updates
   */
  const connectWebSocket = async () => {
    const wsManager = getWebSocketManager();
    const ws = await wsManager.connect(`waiting-room/${consultationId}`);

    // Listen for position updates
    ws.on('waiting_room:position_update', (data: { position: number; estimated_wait: number }) => {
      setPosition(data.position);
      setEstimatedWait(data.estimated_wait);
    });

    // Listen for ready notification
    ws.on('waiting_room:ready', () => {
      onReady?.();
    });

    // Listen for timeout
    ws.on('waiting_room:timeout', () => {
      setError('Your session has timed out. Please rejoin the queue.');
    });
  };

  /**
   * Leave waiting room
   */
  const leaveWaitingRoom = async () => {
    if (!entry) return;

    try {
      await videoAPI.leaveWaitingRoom(entry.id);
      cleanup();
      onLeave?.();
    } catch (err) {
      console.error('Failed to leave waiting room:', err);
    }
  };

  /**
   * Cleanup
   */
  const cleanup = () => {
    const wsManager = getWebSocketManager();
    wsManager.disconnect(`waiting-room/${consultationId}`);
  };

  /**
   * Get priority badge
   */
  const getPriorityBadge = () => {
    if (!entry) return null;

    const colors = {
      low: 'bg-gray-500',
      normal: 'bg-blue-500',
      high: 'bg-orange-500',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${colors[entry.priority]}`}>
        {entry.priority.toUpperCase()} PRIORITY
      </span>
    );
  };

  /**
   * Format wait time
   */
  const formatWaitTime = (minutes: number) => {
    if (minutes < 1) return 'Less than a minute';
    if (minutes === 1) return '1 minute';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="p-8">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Joining waiting room...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="p-8 max-w-md">
          <div className="flex items-center space-x-3 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Error</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex space-x-3">
            <Button onClick={joinWaitingRoom} className="flex-1">
              Try Again
            </Button>
            <Button onClick={onLeave} variant="outline" className="flex-1">
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="p-8 max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            You're in the Waiting Room
          </h1>
          <p className="text-gray-600">
            Please wait while the doctor prepares for your consultation
          </p>
        </div>

        {/* Priority Badge */}
        <div className="flex justify-center mb-6">
          {getPriorityBadge()}
        </div>

        {/* Queue Information */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Position in Queue */}
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center space-x-3 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Position in Queue</span>
            </div>
            <p className="text-4xl font-bold">{position}</p>
            <p className="text-sm opacity-90 mt-1">
              {position === 1 ? "You're next!" : `${position - 1} ahead of you`}
            </p>
          </Card>

          {/* Estimated Wait Time */}
          <Card className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <div className="flex items-center space-x-3 mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Estimated Wait</span>
            </div>
            <p className="text-4xl font-bold">{estimatedWait}</p>
            <p className="text-sm opacity-90 mt-1">
              {formatWaitTime(estimatedWait)}
            </p>
          </Card>
        </div>

        {/* Status Message */}
        <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Your consultation is confirmed
              </p>
              <p className="text-sm text-blue-700 mt-1">
                The doctor will start the video call when ready. Please keep this window open.
              </p>
            </div>
          </div>
        </Card>

        {/* Tips */}
        <Card className="p-4 bg-gray-50 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            While you wait:
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Make sure your camera and microphone are working</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Find a quiet, well-lit location</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Have your medical history and current medications ready</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Prepare any questions you want to ask the doctor</span>
            </li>
          </ul>
        </Card>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            onClick={leaveWaitingRoom}
            variant="outline"
            className="flex-1"
          >
            Leave Queue
          </Button>
          <Button
            onClick={joinWaitingRoom}
            variant="secondary"
            className="flex-1"
          >
            Refresh Status
          </Button>
        </div>

        {/* Joined Time */}
        {entry && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Joined at {new Date(entry.joined_at).toLocaleTimeString()}
          </p>
        )}
      </Card>
    </div>
  );
}
