/**
 * Appointment Analytics Chart Component
 * 
 * Displays appointment metrics with:
 * - Completion rate
 * - Cancellation rate
 * - No-show rate
 * - Appointments trend
 * - Peak hours
 * - Appointments by specialty
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, TrendingUp } from 'lucide-react';
import type { AppointmentAnalytics } from '@/types/analytics.types';

interface AppointmentAnalyticsChartProps {
  data: AppointmentAnalytics;
  loading?: boolean;
}

const STATUS_COLORS = {
  completed: '#10B981',
  cancelled: '#EF4444',
  no_show: '#F59E0B',
};

export function AppointmentAnalyticsChart({ data, loading = false }: AppointmentAnalyticsChartProps) {
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

  // Prepare status distribution data
  const statusData = [
    { name: 'Completed', value: data.completed_appointments, color: STATUS_COLORS.completed },
    { name: 'Cancelled', value: data.cancelled_appointments, color: STATUS_COLORS.cancelled },
    { name: 'No Show', value: data.no_show_appointments, color: STATUS_COLORS.no_show },
  ];

  // Format trend data
  const trendData = data.appointments_trend.map((point) => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    appointments: point.value,
  }));

  // Format peak hours data
  const peakHoursData = data.peak_hours.map((hour) => ({
    hour: `${hour.hour}:00`,
    count: hour.count,
  }));

  return (
    <Card className="p-8 bg-white rounded-3xl border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-2xl">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              Appointment Analytics
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              Total: {data.total_appointments.toLocaleString()} appointments
            </p>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl border border-green-100">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <div>
            <div className="text-xs text-green-700 font-bold">Completion Rate</div>
            <div className="text-lg font-black text-green-600">
              {(data.completion_rate * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-3 gap-8">
        {/* Appointments Trend */}
        <div className="col-span-2">
          <h4 className="text-sm font-bold text-gray-700 mb-4">Appointments Trend</h4>
          <ResponsiveContainer width="100%" height={300}>
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
                dataKey="appointments"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
                name="Appointments"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-4">Status Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  padding: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak Hours Chart */}
      <div className="mt-8">
        <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-600" />
          Peak Appointment Hours
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={peakHoursData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="hour"
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
            <Bar dataKey="count" fill="#8B5CF6" radius={[8, 8, 0, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-black text-green-600">
            {(data.completion_rate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Completion Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-red-600">
            {(data.cancellation_rate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Cancellation Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-amber-600">
            {(data.no_show_rate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">No-Show Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-gray-900">
            {data.average_duration_minutes} min
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Avg Duration</div>
        </div>
      </div>
    </Card>
  );
}
