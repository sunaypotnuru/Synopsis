/**
 * User Analytics Chart Component
 * 
 * Displays user growth and activity metrics with:
 * - User growth trend (line chart)
 * - Users by role (pie chart)
 * - Active users metrics
 * - Retention rate
 */

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Users, TrendingUp } from 'lucide-react';
import type { UserAnalytics } from '@/types/analytics.types';

interface UserAnalyticsChartProps {
  data: UserAnalytics;
  loading?: boolean;
}

const ROLE_COLORS = {
  patients: '#0D9488',
  doctors: '#3B82F6',
  admins: '#8B5CF6',
};

export function UserAnalyticsChart({ data, loading = false }: UserAnalyticsChartProps) {
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

  // Prepare pie chart data
  const roleData = [
    { name: 'Patients', value: data.users_by_role.patients, color: ROLE_COLORS.patients },
    { name: 'Doctors', value: data.users_by_role.doctors, color: ROLE_COLORS.doctors },
    { name: 'Admins', value: data.users_by_role.admins, color: ROLE_COLORS.admins },
  ];

  // Format growth trend data
  const growthData = data.user_growth_trend.map((point) => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    users: point.value,
  }));

  return (
    <Card className="p-8 bg-white rounded-3xl border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-100 rounded-2xl">
            <Users className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              User Growth & Activity
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              Total users: {data.total_users.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Growth Indicator */}
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl border border-green-100">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <div>
            <div className="text-xs text-green-700 font-bold">Growth Rate</div>
            <div className="text-lg font-black text-green-600">
              +{data.growth_rate.percentage.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-3 gap-8">
        {/* Growth Trend Chart */}
        <div className="col-span-2">
          <h4 className="text-sm font-bold text-gray-700 mb-4">User Growth Trend</h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="users"
                stroke="#0D9488"
                strokeWidth={3}
                fill="url(#colorUsers)"
                name="Total Users"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Users by Role Pie Chart */}
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-4">Users by Role</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roleData}
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
                {roleData.map((entry, index) => (
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

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-black text-gray-900">
            {data.daily_active_users.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Daily Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-gray-900">
            {data.monthly_active_users.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Monthly Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-gray-900">
            {data.new_users_this_month.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">New This Month</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-gray-900">
            {(data.retention_rate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Retention Rate</div>
        </div>
      </div>
    </Card>
  );
}
