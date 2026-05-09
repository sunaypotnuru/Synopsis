/**
 * Revenue Chart Component
 * 
 * Displays revenue metrics with:
 * - Total revenue
 * - Revenue growth rate
 * - Revenue trend
 * - Revenue by service
 * - Average transaction value
 */

import React from 'react';
import {
  ResponsiveContainer,
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
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import type { RevenueAnalytics } from '@/types/analytics.types';

interface RevenueChartProps {
  data: RevenueAnalytics;
  loading?: boolean;
}

const SERVICE_COLORS = ['#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

export function RevenueChart({ data, loading = false }: RevenueChartProps) {
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

  // Format revenue trend data
  const trendData = data.revenue_trend.map((point) => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: point.value,
  }));

  // Format service data
  const serviceData = data.revenue_by_service.map((service, index) => ({
    name: service.service,
    value: service.revenue,
    percentage: service.percentage,
    color: SERVICE_COLORS[index % SERVICE_COLORS.length],
  }));

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTrendIcon = () => {
    if (data.growth_rate.trend === 'up') {
      return <TrendingUp className="w-5 h-5 text-green-600" />;
    } else if (data.growth_rate.trend === 'down') {
      return <TrendingDown className="w-5 h-5 text-red-600" />;
    }
    return null;
  };

  const getTrendColor = () => {
    if (data.growth_rate.trend === 'up') return 'bg-green-50 border-green-100 text-green-600';
    if (data.growth_rate.trend === 'down') return 'bg-red-50 border-red-100 text-red-600';
    return 'bg-gray-50 border-gray-100 text-gray-600';
  };

  return (
    <Card className="p-8 bg-white rounded-3xl border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-2xl">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              Revenue Analytics
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              Total: {formatCurrency(data.total_revenue)}
            </p>
          </div>
        </div>

        {/* Growth Rate */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${getTrendColor()}`}>
          {getTrendIcon()}
          <div>
            <div className="text-xs font-bold">Growth Rate</div>
            <div className="text-lg font-black">
              {data.growth_rate.percentage > 0 ? '+' : ''}
              {data.growth_rate.percentage.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-3 gap-8">
        {/* Revenue Trend */}
        <div className="col-span-2">
          <h4 className="text-sm font-bold text-gray-700 mb-4">Revenue Trend</h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
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
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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
                formatter={(value: number) => formatCurrency(value)}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={3}
                fill="url(#colorRevenue)"
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Service */}
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-4">Revenue by Service</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={serviceData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                label={({ name, percentage }) => `${name} ${percentage.toFixed(0)}%`}
                labelLine={false}
              >
                {serviceData.map((entry, index) => (
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
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-black text-gray-900">
            {formatCurrency(data.total_revenue)}
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Total Revenue</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-green-600">
            {formatCurrency(data.revenue_this_month)}
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">This Month</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-gray-600">
            {formatCurrency(data.revenue_last_month)}
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Last Month</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-blue-600">
            {formatCurrency(data.average_transaction_value)}
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1">Avg Transaction</div>
        </div>
      </div>
    </Card>
  );
}
