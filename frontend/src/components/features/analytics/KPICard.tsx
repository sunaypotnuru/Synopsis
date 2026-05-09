/**
 * KPI Card Component
 * 
 * Displays a single key performance indicator with:
 * - Current value
 * - Trend indicator (up/down/stable)
 * - Percentage change
 * - Icon
 * - Color coding
 */

import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  icon: LucideIcon;
  color?: string;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  color = '#0D9488',
  loading = false,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (!change) return null;
    
    switch (change.trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      case 'stable':
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = () => {
    if (!change) return 'text-gray-500';
    
    switch (change.trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-500';
    }
  };

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  if (loading) {
    return (
      <Card className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-20" />
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        {/* Background Gradient */}
        <div
          className="absolute top-0 right-0 w-24 h-24 opacity-5 group-hover:opacity-10 transition-opacity rounded-full -mr-8 -mt-8"
          style={{ backgroundColor: color }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {title}
            </span>
          </div>

          {/* Value */}
          <div className="text-3xl font-black text-gray-900 tracking-tight mb-2">
            {formatValue(value)}
          </div>

          {/* Subtitle and Change */}
          <div className="flex items-center justify-between">
            {subtitle && (
              <span className="text-xs text-gray-500 font-medium">
                {subtitle}
              </span>
            )}
            
            {change && (
              <div className={`flex items-center gap-1 ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="text-xs font-bold">
                  {change.percentage > 0 ? '+' : ''}
                  {change.percentage.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
