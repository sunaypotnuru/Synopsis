/**
 * Call Quality Indicator Component
 * 
 * Displays real-time call quality metrics with visual indicators
 */

import React from 'react';
import type { CallQualityMetrics } from '@/types';
import { Card } from '@/components/ui/card';
import { Signal, SignalHigh, SignalLow, SignalMedium, SignalZero } from 'lucide-react';

interface CallQualityIndicatorProps {
  metrics: CallQualityMetrics | null;
}

export function CallQualityIndicator({ metrics }: CallQualityIndicatorProps) {
  if (!metrics) {
    return (
      <Card className="p-3 bg-gray-800/80 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <SignalZero className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-400">Connecting...</span>
        </div>
      </Card>
    );
  }

  const getQualityIcon = () => {
    switch (metrics.quality_rating) {
      case 'excellent':
        return <SignalHigh className="w-5 h-5 text-green-500" />;
      case 'good':
        return <SignalMedium className="w-5 h-5 text-blue-500" />;
      case 'fair':
        return <SignalLow className="w-5 h-5 text-yellow-500" />;
      case 'poor':
        return <SignalZero className="w-5 h-5 text-red-500" />;
      default:
        return <Signal className="w-5 h-5 text-gray-400" />;
    }
  };

  const getQualityColor = () => {
    switch (metrics.quality_rating) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-blue-500';
      case 'fair':
        return 'text-yellow-500';
      case 'poor':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getQualityText = () => {
    return metrics.quality_rating.charAt(0).toUpperCase() + metrics.quality_rating.slice(1);
  };

  return (
    <Card className="p-3 bg-gray-800/80 backdrop-blur-sm">
      <div className="flex items-center space-x-2">
        {getQualityIcon()}
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${getQualityColor()}`}>
            {getQualityText()}
          </span>
          <span className="text-xs text-gray-400">
            {Math.round(metrics.quality_score)}/100
          </span>
        </div>
      </div>

      {/* Detailed Metrics (Hover to show) */}
      <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400 space-y-1">
        <div className="flex justify-between">
          <span>Video:</span>
          <span>{Math.round(metrics.video_bitrate)} kbps</span>
        </div>
        <div className="flex justify-between">
          <span>Audio:</span>
          <span>{Math.round(metrics.audio_bitrate)} kbps</span>
        </div>
        <div className="flex justify-between">
          <span>Packet Loss:</span>
          <span>{metrics.packet_loss.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Latency:</span>
          <span>{Math.round(metrics.round_trip_time)}ms</span>
        </div>
        <div className="flex justify-between">
          <span>FPS:</span>
          <span>{Math.round(metrics.frames_per_second)}</span>
        </div>
      </div>
    </Card>
  );
}
