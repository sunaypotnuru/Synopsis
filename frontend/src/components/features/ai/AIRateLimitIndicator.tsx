/**
 * AI Rate Limit Indicator Component
 * 
 * Displays current AI usage and rate limits
 * Features:
 * - Requests per minute (RPM)
 * - Tokens per minute (TPM)
 * - Daily quota
 * - Visual progress bars
 * - Warning indicators
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Zap, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { aiAPI } from '@/services/api';

interface RateLimitData {
  requests_per_minute: {
    used: number;
    limit: number;
    remaining: number;
  };
  tokens_per_minute: {
    used: number;
    limit: number;
    remaining: number;
  };
  daily_quota: {
    used: number;
    limit: number;
    remaining: number;
  };
  reset_at: string;
}

export function AIRateLimitIndicator() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-rate-limits'],
    queryFn: async () => {
      const response = await aiAPI.getRateLimitInfo();
      return response as any as RateLimitData;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading || !data) {
    return (
      <Card className="p-3 bg-gray-50 border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Loading usage data...</span>
        </div>
      </Card>
    );
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-amber-600';
    return 'text-green-600';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return AlertTriangle;
    if (percentage >= 75) return AlertTriangle;
    return CheckCircle;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const rpmPercentage = (data.requests_per_minute.used / data.requests_per_minute.limit) * 100;
  const tpmPercentage = (data.tokens_per_minute.used / data.tokens_per_minute.limit) * 100;
  const dailyPercentage = (data.daily_quota.used / data.daily_quota.limit) * 100;

  const StatusIcon = getStatusIcon(Math.max(rpmPercentage, tpmPercentage, dailyPercentage));

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          <h4 className="text-sm font-bold text-gray-900">AI Usage</h4>
        </div>
        <StatusIcon
          className={`w-5 h-5 ${getStatusColor(Math.max(rpmPercentage, tpmPercentage, dailyPercentage))}`}
        />
      </div>

      <div className="space-y-3">
        {/* Requests Per Minute */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">Requests/min</span>
            <span className={`font-bold ${getStatusColor(rpmPercentage)}`}>
              {data.requests_per_minute.used} / {data.requests_per_minute.limit}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getProgressColor(rpmPercentage)}`}
              style={{ width: `${Math.min(rpmPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Tokens Per Minute */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">Tokens/min</span>
            <span className={`font-bold ${getStatusColor(tpmPercentage)}`}>
              {data.tokens_per_minute.used.toLocaleString()} /{' '}
              {data.tokens_per_minute.limit.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getProgressColor(tpmPercentage)}`}
              style={{ width: `${Math.min(tpmPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Daily Quota */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">Daily Quota</span>
            <span className={`font-bold ${getStatusColor(dailyPercentage)}`}>
              {data.daily_quota.used.toLocaleString()} /{' '}
              {data.daily_quota.limit.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getProgressColor(dailyPercentage)}`}
              style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Reset Time */}
      <div className="mt-3 pt-3 border-t border-purple-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Resets in:</span>
          <span className="font-medium">
            {new Date(data.reset_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Warning Message */}
      {(rpmPercentage >= 90 || tpmPercentage >= 90 || dailyPercentage >= 90) && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-800">
            Approaching rate limit. Consider reducing request frequency.
          </p>
        </div>
      )}
    </Card>
  );
}
