import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  BarChart3, Users, Calendar, DollarSign, TrendingUp, TrendingDown,
  Clock, Star, Activity, Eye, ArrowUpRight, ArrowDownRight, RefreshCw,
  Filter, Download, ChevronRight, AlertCircle, CheckCircle
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
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface AnalyticsOverview {
  summary: {
    total_patients: number;
    new_patients_this_month: number;
    total_appointments: number;
    completed_appointments: number;
    cancelled_appointments: number;
    total_revenue: number;
    average_rating: number;
    response_time: number; // minutes
    patient_satisfaction: number; // percentage
    growth_metrics: {
      patients_growth: number;
      revenue_growth: number;
      appointments_growth: number;
      rating_growth: number;
    };
  };
  appointment_trends: Array<{
    date: string;
    appointments: number;
    completed: number;
    cancelled: number;
    revenue: number;
  }>;
  patient_demographics: Array<{
    age_group: string;
    count: number;
    percentage: number;
  }>;
  top_conditions: Array<{
    condition: string;
    count: number;
    percentage: number;
  }>;
  performance_metrics: {
    consultation_time: number;
    follow_up_rate: number;
    prescription_accuracy: number;
    patient_retention: number;
  };
  recent_activities: Array<{
    id: string;
    type: 'appointment' | 'review' | 'achievement' | 'milestone';
    title: string;
    description: string;
    timestamp: string;
    value?: number;
  }>;
}
export default function DoctorAnalyticsDashboard() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');

  // API call to doctor analytics overview endpoint
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['doctor-analytics-overview', timeFilter],
    queryFn: async (): Promise<AnalyticsOverview> => {
      // This connects to: GET /api/v1/doctor/analytics/overview
      const response = await fetch(`/api/v1/doctor/analytics/overview?period=${timeFilter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
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
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Unable to Load Analytics</h2>
          <p className="text-[#64748B] mb-6">There was an error loading your analytics data.</p>
          <Button onClick={() => refetch()} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const summary = analytics.summary;
  const COLORS = ['#0EA5E9', '#22C55E', '#8B5CF6', '#F59E0B', '#EF4444'];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Analytics Dashboard</h1>
            <p className="text-[#64748B]">Comprehensive insights into your practice performance</p>
          </div>
          <div className="flex gap-3">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => navigate('/doctor/analytics/patients')}
              className="border-[#E2E8F0] hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
            >
              <Eye className="w-4 h-4 mr-2" />
              Patient Analytics
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/doctor/analytics/revenue')}
              className="border-[#E2E8F0] hover:border-[#22C55E] hover:text-[#22C55E]"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Revenue Analytics
            </Button>
            <Button className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </motion.div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Total Patients */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                    <ArrowUpRight className="w-4 h-4" />
                    {summary.growth_metrics.patients_growth}%
                  </div>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Total Patients</p>
                <p className="text-3xl font-bold text-[#0F172A]">{summary.total_patients.toLocaleString()}</p>
                <p className="text-xs text-[#64748B] mt-2">
                  +{summary.new_patients_this_month} new this month
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Appointments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                    <ArrowUpRight className="w-4 h-4" />
                    {summary.growth_metrics.appointments_growth}%
                  </div>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Total Appointments</p>
                <p className="text-3xl font-bold text-[#0F172A]">{summary.total_appointments.toLocaleString()}</p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-[#64748B] mb-1">
                    <span>Completion Rate</span>
                    <span>{Math.round((summary.completed_appointments / summary.total_appointments) * 100)}%</span>
                  </div>
                  <Progress value={(summary.completed_appointments / summary.total_appointments) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                    <ArrowUpRight className="w-4 h-4" />
                    {summary.growth_metrics.revenue_growth}%
                  </div>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-[#0F172A]">₹{summary.total_revenue.toLocaleString()}</p>
                <p className="text-xs text-[#64748B] mt-2">
                  Avg: ₹{Math.round(summary.total_revenue / summary.completed_appointments).toLocaleString()} per appointment
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Patient Satisfaction */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                    <ArrowUpRight className="w-4 h-4" />
                    {summary.growth_metrics.rating_growth}%
                  </div>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Patient Satisfaction</p>
                <p className="text-3xl font-bold text-[#0F172A]">{summary.patient_satisfaction}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium text-[#0F172A]">{summary.average_rating.toFixed(1)}</span>
                  <span className="text-xs text-[#64748B]">average rating</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Appointment Trends */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#0EA5E9]" />
                    Appointment Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.appointment_trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="appointments" 
                          stroke="#0EA5E9" 
                          fill="#0EA5E9" 
                          fillOpacity={0.1}
                          strokeWidth={2}
                          name="Total Appointments"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="completed" 
                          stroke="#22C55E" 
                          fill="#22C55E" 
                          fillOpacity={0.1}
                          strokeWidth={2}
                          name="Completed"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Patient Demographics */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#8B5CF6]" />
                    Patient Demographics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.patient_demographics}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                        >
                          {analytics.patient_demographics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {analytics.patient_demographics.map((demo, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-[#64748B]">{demo.age_group}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#0F172A]">{demo.count}</p>
                          <p className="text-xs text-[#64748B]">{demo.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Conditions */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#22C55E]" />
                  Most Common Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {analytics.top_conditions.map((condition, index) => (
                    <div key={index} className="text-center p-4 bg-[#F8FAFC] rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-white mx-auto mb-3 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-[#22C55E]" />
                      </div>
                      <h3 className="font-semibold text-[#0F172A] mb-1">{condition.condition}</h3>
                      <p className="text-2xl font-bold text-[#22C55E] mb-1">{condition.count}</p>
                      <p className="text-sm text-[#64748B]">{condition.percentage}% of patients</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A]">Revenue vs Appointments Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.appointment_trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="appointments" fill="#0EA5E9" name="Appointments" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={3} name="Revenue (₹)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(analytics.performance_metrics).map(([key, value], index) => (
                <Card key={key} className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A] capitalize">
                      {key.replace('_', ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <p className="text-4xl font-bold text-[#0EA5E9] mb-2">
                        {typeof value === 'number' ? 
                          (key.includes('time') ? `${value} min` : `${value}%`) : 
                          value
                        }
                      </p>
                      <Progress 
                        value={typeof value === 'number' ? value : 0} 
                        className="h-3 mb-2"
                      />
                      <p className="text-sm text-[#64748B]">
                        {value >= 80 ? 'Excellent' : value >= 60 ? 'Good' : 'Needs Improvement'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#F59E0B]" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.recent_activities.map((activity, index) => (
                    <div key={activity.id} className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-lg">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        activity.type === 'appointment' ? 'bg-blue-100' :
                        activity.type === 'review' ? 'bg-yellow-100' :
                        activity.type === 'achievement' ? 'bg-green-100' :
                        'bg-purple-100'
                      }`}>
                        {activity.type === 'appointment' && <Calendar className="w-5 h-5 text-blue-600" />}
                        {activity.type === 'review' && <Star className="w-5 h-5 text-yellow-600" />}
                        {activity.type === 'achievement' && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {activity.type === 'milestone' && <TrendingUp className="w-5 h-5 text-purple-600" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#0F172A]">{activity.title}</h3>
                        <p className="text-sm text-[#64748B]">{activity.description}</p>
                        <p className="text-xs text-[#64748B] mt-1">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      {activity.value && (
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#0EA5E9]">{activity.value}</p>
                        </div>
                      )}
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

