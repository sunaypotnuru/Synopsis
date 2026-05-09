/**
 * Quality Diagnostics Component
 * 
 * Detailed diagnostics panel for troubleshooting call quality issues
 */

import React from 'react';
import type { CallQualityMetrics } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Activity, Wifi, Video, Mic, AlertCircle, CheckCircle } from 'lucide-react';

interface QualityDiagnosticsProps {
  consultationId: string;
  metrics: CallQualityMetrics | null;
  connectionState: RTCPeerConnectionState;
  onClose: () => void;
}

export function QualityDiagnostics({
  metrics,
  connectionState,
  onClose,
}: QualityDiagnosticsProps) {
  const getStatusIcon = (value: number, thresholds: { good: number; fair: number }) => {
    if (value >= thresholds.good) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (value >= thresholds.fair) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getConnectionStateColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'connecting':
        return 'text-blue-600 bg-blue-100';
      case 'disconnected':
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Call Quality Diagnostics</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Connection State */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wifi className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Connection State</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConnectionStateColor()}`}>
              {connectionState.toUpperCase()}
            </span>
          </div>
        </Card>

        {metrics ? (
          <>
            {/* Overall Quality */}
            <Card className="p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">Overall Quality Score</span>
                <span className="text-2xl font-bold">{Math.round(metrics.quality_score)}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    metrics.quality_score >= 80 ? 'bg-green-500' :
                    metrics.quality_score >= 60 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${metrics.quality_score}%` }}
                />
              </div>
            </Card>

            {/* Detailed Metrics */}
            <div className="space-y-4">
              {/* Video Quality */}
              <Card className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Video className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Video Quality</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Bitrate</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(metrics.video_bitrate, { good: 1000, fair: 500 })}
                      <span className="font-medium">{Math.round(metrics.video_bitrate)} kbps</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Frame Rate</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(metrics.frames_per_second, { good: 25, fair: 15 })}
                      <span className="font-medium">{Math.round(metrics.frames_per_second)} fps</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Audio Quality */}
              <Card className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Mic className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Audio Quality</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Bitrate</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(metrics.audio_bitrate, { good: 64, fair: 32 })}
                      <span className="font-medium">{Math.round(metrics.audio_bitrate)} kbps</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Jitter</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(100 - metrics.jitter, { good: 90, fair: 70 })}
                      <span className="font-medium">{metrics.jitter.toFixed(1)} ms</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Network Quality */}
              <Card className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Wifi className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Network Quality</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Packet Loss</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(100 - metrics.packet_loss, { good: 98, fair: 95 })}
                      <span className="font-medium">{metrics.packet_loss.toFixed(2)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Latency (RTT)</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(1000 - metrics.round_trip_time, { good: 900, fair: 700 })}
                      <span className="font-medium">{Math.round(metrics.round_trip_time)} ms</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recommendations */}
            {metrics.quality_score < 60 && (
              <Card className="p-4 bg-yellow-50 border-yellow-200 mt-6">
                <h3 className="font-medium text-yellow-900 mb-2">Recommendations</h3>
                <ul className="space-y-1 text-sm text-yellow-700">
                  {metrics.video_bitrate < 500 && (
                    <li>• Close other applications using bandwidth</li>
                  )}
                  {metrics.packet_loss > 5 && (
                    <li>• Move closer to your WiFi router or use ethernet</li>
                  )}
                  {metrics.frames_per_second < 15 && (
                    <li>• Reduce video quality or disable video temporarily</li>
                  )}
                  {metrics.round_trip_time > 300 && (
                    <li>• Check your internet connection stability</li>
                  )}
                </ul>
              </Card>
            )}
          </>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-600">No quality metrics available yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Metrics will appear once the call is connected.
            </p>
          </Card>
        )}

        {/* Close Button */}
        <Button onClick={onClose} className="w-full mt-6">
          Close Diagnostics
        </Button>
      </Card>
    </div>
  );
}
