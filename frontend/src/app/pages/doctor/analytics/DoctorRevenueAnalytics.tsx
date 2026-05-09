import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, Calendar, 
  CreditCard, Users, Clock, BarChart3, PieChart, Download, Filter,
  AlertTriangle, CheckCircle, Target, Award, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Legend
} from 'recharts';

interface RevenueAnalytics {
  summary: {
    total_revenue: number;
    monthly_revenue: number;
    revenue_growth: number;
    average_per_appointment: number;
    total_appointments: number;
    conversion_rate: number;
    pending_payments: number;
    refunds_total: number;
  };
  trends: Array<{
    month: string;
    revenue: number;
    appointments: number;
    average_fee: number;
    growth_rate: number;
  }>;
  breakdown: {
    by_service: Array<{
      service: string;
      revenue: number;
      appointments: number;
      percentage: number;
    }>;
    by_payment_method: Array<{
      method: string;
      amount: number;
      percentage: number;
      transactions: number;
    }>;
    by_time_period: Array<{
      period: string;
      revenue: number;
      growth: number;
    }>;
  };
  forecasting: {
    next_month_prediction: number;
    confidence_level: number;
    growth_trajectory: Array<{
      month: string;
      predicted_revenue: number;
      lower_bound: number;
      upper_bound: number;
    }>;
  };
  performance_metrics: {
    revenue_per_hour: number;
    patient_lifetime_value: number;
    appointment_show_rate: number;
    payment_collection_rate: number;
    refund_rate: number;
    peak_earning_hours: Array<{
      hour: string;
      revenue: number;
    }>;
  };
}

export default function DoctorRevenueAnalytics() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState('year');
  const [activeTab, setActiveTab] = useState('overview');

  // API call to doctor revenue analytics endpoint
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['doctor-revenue-analytics', timeFilter],
    queryFn: async (): Promise<RevenueAnalytics> => {
      // This connects to: GET /api/v1/doctor/analytics/revenue
      const response = await fetch(`/api/v1/doctor/analytics/revenue?period=${timeFilter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch revenue analytics');
      }
      
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="w-[300px] h-[40px]" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-[140px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Unable to Load Revenue Analytics</h2>
          <p className="text-[#64748B] mb-6">There was an error loading your revenue analytics data.</p>
          <Button onClick={() => refetch()} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const summary = analytics.summary;
  const COLORS = ['#0EA5E9', '#22C55E', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/doctor/analytics')}
              className="p-2 hover:bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Revenue Analytics</h1>
              <p className="text-[#64748B]">Comprehensive insights into your earnings and financial performance</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Total Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Total
                  </Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-[#0F172A]">${summary.total_revenue.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  {summary.revenue_growth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <p className={`text-xs ${summary.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(summary.revenue_growth)}% vs last period
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Monthly
                  </Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">This Month</p>
                <p className="text-3xl font-bold text-[#0F172A]">${summary.monthly_revenue.toLocaleString()}</p>
                <p className="text-xs text-[#64748B] mt-2">
                  {summary.total_appointments} appointments
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Average Per Appointment */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    Average
                  </Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Per Appointment</p>
                <p className="text-3xl font-bold text-[#0F172A]">${summary.average_per_appointment}</p>
                <p className="text-xs text-[#64748B] mt-2">
                  {summary.conversion_rate}% conversion rate
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pending Payments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    Pending
                  </Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Pending Payments</p>
                <p className="text-3xl font-bold text-[#0F172A]">${summary.pending_payments.toLocaleString()}</p>
                <p className="text-xs text-[#64748B] mt-2">
                  ${summary.refunds_total} in refunds
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Revenue Trends */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#0EA5E9]" />
                    Revenue Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={analytics.trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend />
                        <Area 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#0EA5E9" 
                          fill="#0EA5E9" 
                          fillOpacity={0.3}
                          name="Revenue ($)"
                        />
                        <Bar 
                          yAxisId="right"
                          dataKey="appointments" 
                          fill="#22C55E" 
                          name="Appointments"
                          opacity={0.7}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#8B5CF6]" />
                    Key Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#64748B]">Revenue/Hour</span>
                      <Zap className="w-4 h-4 text-[#F59E0B]" />
                    </div>
                    <p className="text-2xl font-bold text-[#0F172A]">${analytics.performance_metrics.revenue_per_hour}</p>
                  </div>
                  
                  <div className="p-4 bg-[#F8FAFC] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#64748B]">Patient LTV</span>
                      <Award className="w-4 h-4 text-[#8B5CF6]" />
                    </div>
                    <p className="text-2xl font-bold text-[#0F172A]">${analytics.performance_metrics.patient_lifetime_value}</p>
                  </div>
                  
                  <div className="p-4 bg-[#F8FAFC] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#64748B]">Show Rate</span>
                      <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                    </div>
                    <p className="text-2xl font-bold text-[#0F172A]">{analytics.performance_metrics.appointment_show_rate}%</p>
                    <Progress value={analytics.performance_metrics.appointment_show_rate} className="h-2 mt-2" />
                  </div>
                  
                  <div className="p-4 bg-[#F8FAFC] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#64748B]">Collection Rate</span>
                      <CreditCard className="w-4 h-4 text-[#0EA5E9]" />
                    </div>
                    <p className="text-2xl font-bold text-[#0F172A]">{analytics.performance_metrics.payment_collection_rate}%</p>
                    <Progress value={analytics.performance_metrics.payment_collection_rate} className="h-2 mt-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Peak Earning Hours */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#F59E0B]" />
                  Peak Earning Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.performance_metrics.peak_earning_hours}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Revenue Growth */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#0EA5E9]" />
                    Revenue Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#0EA5E9" 
                          strokeWidth={3}
                          dot={{ fill: '#0EA5E9', strokeWidth: 2, r: 4 }}
                          name="Revenue ($)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Average Fee Trends */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#22C55E]" />
                    Average Fee Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="average_fee" 
                          stroke="#22C55E" 
                          fill="#22C55E" 
                          fillOpacity={0.6}
                          name="Average Fee ($)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Growth Rate Analysis */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#8B5CF6]" />
                  Monthly Growth Rate Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar 
                        dataKey="growth_rate" 
                        fill="#8B5CF6" 
                        radius={[4, 4, 0, 0]}
                        name="Growth Rate (%)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Revenue by Service */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-[#0EA5E9]" />
                    Revenue by Service
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={analytics.breakdown.by_service}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="revenue"
                        >
                          {analytics.breakdown.by_service.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {analytics.breakdown.by_service.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-lg">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium text-[#0F172A]">{service.service}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#0F172A]">${service.revenue.toLocaleString()}</p>
                          <p className="text-xs text-[#64748B]">{service.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#22C55E]" />
                    Payment Methods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.breakdown.by_payment_method.map((method, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-[#22C55E]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#0F172A]">{method.method}</p>
                            <p className="text-sm text-[#64748B]">{method.transactions} transactions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#0F172A]">${method.amount.toLocaleString()}</p>
                          <p className="text-sm text-[#64748B]">{method.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Time Period Breakdown */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#8B5CF6]" />
                  Revenue by Time Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.breakdown.by_time_period}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="period" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Forecasting Tab */}
          <TabsContent value="forecasting" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Next Month Prediction */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#0EA5E9]" />
                    Next Month Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-6">
                  <p className="text-4xl font-bold text-[#0EA5E9] mb-4">
                    ${analytics.forecasting.next_month_prediction.toLocaleString()}
                  </p>
                  <div className="mb-4">
                    <p className="text-sm text-[#64748B] mb-2">Confidence Level</p>
                    <Progress value={analytics.forecasting.confidence_level} className="h-3" />
                    <p className="text-xs text-[#64748B] mt-1">{analytics.forecasting.confidence_level}%</p>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={
                      analytics.forecasting.confidence_level >= 80 ? 'bg-green-100 text-green-700' :
                      analytics.forecasting.confidence_level >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }
                  >
                    {analytics.forecasting.confidence_level >= 80 ? 'High Confidence' :
                     analytics.forecasting.confidence_level >= 60 ? 'Medium Confidence' :
                     'Low Confidence'}
                  </Badge>
                </CardContent>
              </Card>

              {/* Growth Trajectory */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#22C55E]" />
                    Revenue Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.forecasting.growth_trajectory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="upper_bound" 
                          stackId="1"
                          stroke="#22C55E" 
                          fill="#22C55E" 
                          fillOpacity={0.2}
                          name="Upper Bound"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="predicted_revenue" 
                          stackId="2"
                          stroke="#0EA5E9" 
                          fill="#0EA5E9" 
                          fillOpacity={0.6}
                          name="Predicted Revenue"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="lower_bound" 
                          stackId="3"
                          stroke="#8B5CF6" 
                          fill="#8B5CF6" 
                          fillOpacity={0.2}
                          name="Lower Bound"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Forecast Summary */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#F59E0B]" />
                  Forecast Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {analytics.forecasting.growth_trajectory.slice(0, 3).map((forecast, index) => (
                    <div key={index} className="text-center p-6 bg-[#F8FAFC] rounded-xl">
                      <h3 className="font-semibold text-[#0F172A] mb-2">{forecast.month}</h3>
                      <p className="text-2xl font-bold text-[#0EA5E9] mb-2">
                        ${forecast.predicted_revenue.toLocaleString()}
                      </p>
                      <div className="text-xs text-[#64748B] space-y-1">
                        <p>Range: ${forecast.lower_bound.toLocaleString()} - ${forecast.upper_bound.toLocaleString()}</p>
                        <p>Confidence: {analytics.forecasting.confidence_level}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}




