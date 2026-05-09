/**
 * Healthcare Analytics Dashboard Component
 * 
 * Main dashboard for Netra-AI healthcare analytics
 * Displays comprehensive metrics including:
 * - User analytics
 * - Appointment analytics
 * - AI usage analytics
 * - Revenue analytics
 * - System performance
 * - Messaging analytics
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { analyticsAPI } from '@/services/api';
import type { AnalyticsOverview } from '@/types/analytics.types';
import { KPICard } from './KPICard';
import { UserAnalyticsChart } from './UserAnalyticsChart';
import { AppointmentAnalyticsChart } from './AppointmentAnalyticsChart';
import { AIUsageChart } from './AIUsageChart';
import { RevenueChart } from './RevenueChart';
import { SystemPerformancePanel } from './SystemPerformancePanel';
import { DataExportButton } from './DataExportButton';
import {
  Users,
  Calendar,
  Brain,
  DollarSign,
  MessageSquare,
  Server,
  RefreshCcw,
  BarChart3,
  AlertCircle,
} from 'lucide-react';

export function HealthcareAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
  });

  // Fetch analytics overview
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-overview', dateRange],
    queryFn: async () => {
      const response = await analyticsAPI.getAnalyticsOverview({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });
      return response;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="p-8 max-w-md">
          <div className="flex items-center space-x-3 text-red-600 mb-4">
            <AlertCircle className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Error Loading Analytics</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Failed to load analytics data. Please try again.
          </p>
          <Button onClick={handleRefresh}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-100 rounded-2xl">
            <BarChart3 className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Healthcare Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              Comprehensive platform metrics and insights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <DataExportButton
            type="all"
            dateRange={dateRange}
            label="Export Report"
            variant="default"
            size="sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard
          title="Total Users"
          value={data?.user_analytics.total_users || 0}
          subtitle="All registered users"
          change={data?.user_analytics.growth_rate}
          icon={Users}
          color="#0D9488"
          loading={isLoading}
        />

        <KPICard
          title="Appointments"
          value={data?.appointment_analytics.total_appointments || 0}
          subtitle="Total scheduled"
          change={{
            value: data?.appointment_analytics.completed_appointments || 0,
            percentage: (data?.appointment_analytics.completion_rate || 0) * 100,
            trend: 'up',
          }}
          icon={Calendar}
          color="#3B82F6"
          loading={isLoading}
        />

        <KPICard
          title="AI Consultations"
          value={data?.ai_usage_analytics.total_consultations || 0}
          subtitle="AI-powered diagnoses"
          change={{
            value: data?.ai_usage_analytics.high_confidence_count || 0,
            percentage: (data?.ai_usage_analytics.average_confidence_score || 0) * 100,
            trend: 'up',
          }}
          icon={Brain}
          color="#8B5CF6"
          loading={isLoading}
        />

        <KPICard
          title="Revenue"
          value={`$${((data?.revenue_analytics.total_revenue || 0) / 1000).toFixed(1)}k`}
          subtitle="Total earnings"
          change={data?.revenue_analytics.growth_rate}
          icon={DollarSign}
          color="#10B981"
          loading={isLoading}
        />

        <KPICard
          title="Messages"
          value={data?.messaging_analytics.total_messages || 0}
          subtitle="Total sent"
          change={{
            value: data?.messaging_analytics.messages_today || 0,
            percentage: 15.3,
            trend: 'up',
          }}
          icon={MessageSquare}
          color="#F59E0B"
          loading={isLoading}
        />
      </div>

      {/* User Analytics */}
      {data?.user_analytics && (
        <UserAnalyticsChart data={data.user_analytics} loading={isLoading} />
      )}

      {/* Appointment & AI Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {data?.appointment_analytics && (
          <AppointmentAnalyticsChart
            data={data.appointment_analytics}
            loading={isLoading}
          />
        )}

        {data?.ai_usage_analytics && (
          <AIUsageChart data={data.ai_usage_analytics} loading={isLoading} />
        )}
      </div>

      {/* Revenue Analytics */}
      {data?.revenue_analytics && (
        <RevenueChart data={data.revenue_analytics} loading={isLoading} />
      )}

      {/* System Performance */}
      {data?.system_performance && (
        <SystemPerformancePanel
          data={data.system_performance}
          loading={isLoading}
        />
      )}

      {/* Messaging Analytics */}
      {data?.messaging_analytics && (
        <Card className="p-8 bg-white rounded-3xl border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-100 rounded-2xl">
              <MessageSquare className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                Messaging Analytics
              </h3>
              <p className="text-sm text-gray-500 font-medium">
                Communication metrics and trends
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-2xl">
              <div className="text-3xl font-black text-gray-900">
                {data.messaging_analytics.total_messages.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 font-medium mt-2">Total Messages</div>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-2xl">
              <div className="text-3xl font-black text-amber-600">
                {data.messaging_analytics.messages_today.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 font-medium mt-2">Today</div>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-2xl">
              <div className="text-3xl font-black text-blue-600">
                {data.messaging_analytics.total_conversations.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 font-medium mt-2">Conversations</div>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-2xl">
              <div className="text-3xl font-black text-green-600">
                {data.messaging_analytics.average_response_time_minutes.toFixed(1)} min
              </div>
              <div className="text-xs text-gray-500 font-medium mt-2">Avg Response</div>
            </div>
          </div>
        </Card>
      )}

      {/* Footer Info */}
      <div className="text-center text-sm text-gray-500 pt-8">
        <p>
          Last updated: {data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'N/A'}
        </p>
        <p className="mt-1">
          Data refreshes automatically every minute
        </p>
      </div>
    </motion.div>
  );
}
