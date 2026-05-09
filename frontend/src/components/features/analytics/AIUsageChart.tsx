/**
 * AI Usage Chart Component
 * 
 * Displays AI consultation metrics with:
 * - Total consultations
 * - Average confidence score
 * - Consultations by model
 * - Usage trend
 * - Confidence distribution
 * - Error rate
 */

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Brain, Zap, AlertTriangle } from 'lucide-react';
import type { AIUsageAnalytics } from '@/types/analytics.types';

interface AIUsageChartProps {
  data: AIUsageAnalytics;
  loading?: boolean;
}

export function AIUsageChart({ data, loading = false }: AIUsageChartProps) {
  if (loading) {
    return (
      <Card className="p-8 bg-white rounded-3xl border-gray-100 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </Card>
    );
  }

  // Format usage trend data
  const trendData = data.usage_trend.map((point) => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    consultations: point.value,
  }));

  // Format model data
  const modelData = data.consultations_by_model.map((model) => ({
    name: model.model,
    consultations: model.count,
    confidence: (model.average_confidence * 100).toFixed(1),
  }));

  return (
    <Card className="p-8 bg-white rounded-3xl border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-2xl">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              AI Usage Analytics
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              Total: {data.total_consultations.toLocaleString()} consultations
            </p>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-100">
          <Zap className="w-5 h-5 text-purple-600" />
          <div>
            <div className="text-xs text-purple-700 font-bold">Avg Confidence</div>
            <div className="text-lg font-black text-purple-600">
              {(data.average_confidence_score * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-8">
        {/* Usage Trend */}
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-4">Consultation Trend</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={11}
                fontWeight={600}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={11}
                fontWeight={600}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  padding: '12px',
                }}
                itemStyle={{ fontWeight: 700, fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="consultations"
                stroke="#8B5CF6"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
                name="Consultations"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Consultations by Model */}
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-4">Consultations by Model</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={modelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                stroke="#9CA3AF"
                fontSize={11}
                fontWeight={600}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={11}
                fontWeight={600}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#F8FAFC' }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  padding: '12px',
                }}
              />
              <Bar dataKey="consultations" fill="#8B5CF6" radius={[8, 8, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4 mt-8 pt-8 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-black text-purple-600">
            {data.total_consultations.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Total Consultations</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-green-600">
            {data.high_confidence_count.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">High Confidence</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-amber-600">
            {data.low_confidence_count.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Low Confidence</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-gray-900">
            {data.average_response_time_ms}ms
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Avg Response Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-red-600">
            {(data.error_rate * 100).toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Error Rate</div>
        </div>
      </div>

      {/* Error Rate Warning */}
      {data.error_rate > 0.05 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-amber-900">High Error Rate Detected</div>
            <div className="text-xs text-amber-700 mt-1">
              Error rate is above 5%. Consider reviewing AI model performance and logs.
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
