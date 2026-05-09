/**
 * System Performance Panel Component
 * 
 * Displays system health metrics with:
 * - Active sessions
 * - Response time
 * - Error rate
 * - Uptime percentage
 * - Database stats
 * - Cache stats
 * - API stats
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Server, Database, Zap, Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { SystemPerformance } from '@/types/analytics.types';

interface SystemPerformancePanelProps {
  data: SystemPerformance;
  loading?: boolean;
}

export function SystemPerformancePanel({ data, loading = false }: SystemPerformancePanelProps) {
  if (loading) {
    return (
      <Card className="p-8 bg-white rounded-3xl border-gray-100 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const getHealthStatus = () => {
    if (data.uptime_percentage >= 99.9) {
      return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
    } else if (data.uptime_percentage >= 99) {
      return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle };
    } else if (data.uptime_percentage >= 95) {
      return { label: 'Fair', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle };
    } else {
      return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle };
    }
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  return (
    <Card className="p-8 bg-white rounded-3xl border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-2xl">
            <Server className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              System Performance
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              Real-time system health metrics
            </p>
          </div>
        </div>

        {/* Health Status Badge */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${healthStatus.bg} ${healthStatus.color}`}>
          <HealthIcon className="w-5 h-5" />
          <div>
            <div className="text-xs font-bold">System Health</div>
            <div className="text-lg font-black">{healthStatus.label}</div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Active Sessions */}
        <div className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="text-sm font-bold text-gray-700">Active Sessions</h4>
          </div>
          <div className="text-3xl font-black text-gray-900">
            {data.active_sessions.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Current active users</div>
        </div>

        {/* Response Time */}
        <div className="p-6 bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-xl">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="text-sm font-bold text-gray-700">Response Time</h4>
          </div>
          <div className="text-3xl font-black text-gray-900">
            {data.average_response_time_ms}ms
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Average API response</div>
        </div>

        {/* Error Rate */}
        <div className="p-6 bg-gradient-to-br from-red-50 to-white rounded-2xl border border-red-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h4 className="text-sm font-bold text-gray-700">Error Rate</h4>
          </div>
          <div className="text-3xl font-black text-gray-900">
            {(data.error_rate * 100).toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Failed requests</div>
        </div>

        {/* Uptime */}
        <div className="p-6 bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-xl">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <h4 className="text-sm font-bold text-gray-700">Uptime</h4>
          </div>
          <div className="text-3xl font-black text-gray-900">
            {data.uptime_percentage.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">System availability</div>
        </div>
      </div>

      {/* Database Stats */}
      <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-gray-700" />
          <h4 className="text-sm font-bold text-gray-700">Database Performance</h4>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-lg font-black text-gray-900">
              {data.database_stats.total_connections}
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1">Total Connections</div>
          </div>
          <div>
            <div className="text-lg font-black text-green-600">
              {data.database_stats.active_connections}
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1">Active</div>
          </div>
          <div>
            <div className="text-lg font-black text-gray-600">
              {data.database_stats.idle_connections}
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1">Idle</div>
          </div>
          <div>
            <div className="text-lg font-black text-blue-600">
              {data.database_stats.database_size_mb.toFixed(1)} MB
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1">DB Size</div>
          </div>
        </div>
      </div>

      {/* Cache Stats */}
      <div className="mt-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-gray-700" />
          <h4 className="text-sm font-bold text-gray-700">Cache Performance</h4>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-lg font-black text-green-600">
              {(data.cache_stats.hit_rate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1">Hit Rate</div>
          </div>
          <div>
            <div className="text-lg font-black text-red-600">
              {(data.cache_stats.miss_rate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1">Miss Rate</div>
          </div>
          <div>
            <div className="text-lg font-black text-gray-900">
              {data.cache_stats.total_keys.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1">Total Keys</div>
          </div>
          <div>
            <div className="text-lg font-black text-blue-600">
              {data.cache_stats.memory_usage_mb.toFixed(1)} MB
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1">Memory Usage</div>
          </div>
        </div>
      </div>

      {/* API Stats */}
      <div className="mt-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-gray-700" />
          <h4 className="text-sm font-bold text-gray-700">API Performance</h4>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-lg font-black text-gray-900">
              {data.api_stats.total_requests.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1">Total Requests</div>
          </div>
          <div>
            <div className="text-lg font-black text-green-600">
              {data.api_stats.successful_requests.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1">Successful</div>
          </div>
          <div>
            <div className="text-lg font-black text-red-600">
              {data.api_stats.failed_requests.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1">Failed</div>
          </div>
          <div>
            <div className="text-lg font-black text-blue-600">
              {data.api_stats.average_response_time.toFixed(0)}ms
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1">Avg Response</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
