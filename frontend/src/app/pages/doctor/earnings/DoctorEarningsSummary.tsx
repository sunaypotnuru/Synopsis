import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  DollarSign, TrendingUp, Calendar, Users, Download, ArrowUpRight, 
  ArrowDownRight, CreditCard, Wallet, Target, Clock, Eye, Filter,
  BarChart3, PieChart, LineChart, RefreshCw, AlertCircle, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface EarningsData {
  summary: {
    today: number;
    week: number;
    month: number;
    year: number;
    total: number;
    pending: number;
    growth_percentage: number;
    avg_per_appointment: number;
    total_appointments: number;
    completed_appointments: number;
    monthly_goal: number;
    goal_progress: number;
  };
  trends: Array<{
    date: string;
    earnings: number;
    appointments: number;
    avg_per_appointment: number;
  }>;
  breakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  payment_methods: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
  monthly_comparison: Array<{
    month: string;
    current_year: number;
    previous_year: number;
  }>;
}

export default function DoctorEarningsSummary() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');

  // Mock API call - replace with actual API
  const { data: earningsData, isLoading, refetch } = useQuery({
    queryKey: ['doctor-earnings-summary', timeFilter],
    queryFn: async (): Promise<EarningsData> => {
      // Mock earnings data
      return {
        summary: {
          today: 2500,
          week: 15000,
          month: 65000,
          year: 780000,
          total: 1250000,
          pending: 8500,
          growth_percentage: 12.5,
          avg_per_appointment: 1200,
          total_appointments: 156,
          completed_appointments: 142,
          monthly_goal: 80000,
          goal_progress: 81.25
        },
        trends: [
          { date: '2024-01', earnings: 58000, appointments: 48, avg_per_appointment: 1208 },
          { date: '2024-02', earnings: 62000, appointments: 52, avg_per_appointment: 1192 },
          { date: '2024-03', earnings: 59000, appointments: 49, avg_per_appointment: 1204 },
          { date: '2024-04', earnings: 67000, appointments: 56, avg_per_appointment: 1196 },
          { date: '2024-05', earnings: 65000, appointments: 54, avg_per_appointment: 1204 }
        ],
        breakdown: [
          { category: 'Consultations', amount: 45000, percentage: 69.2, color: '#0EA5E9' },
          { category: 'Follow-ups', amount: 12000, percentage: 18.5, color: '#22C55E' },
          { category: 'Procedures', amount: 6000, percentage: 9.2, color: '#8B5CF6' },
          { category: 'Emergency', amount: 2000, percentage: 3.1, color: '#F59E0B' }
        ],
        payment_methods: [
          { method: 'Digital Payments', amount: 48000, count: 98 },
          { method: 'Cash', amount: 12000, count: 28 },
          { method: 'Insurance', amount: 5000, count: 16 }
        ],
        monthly_comparison: [
          { month: 'Jan', current_year: 58000, previous_year: 52000 },
          { month: 'Feb', current_year: 62000, previous_year: 55000 },
          { month: 'Mar', current_year: 59000, previous_year: 58000 },
          { month: 'Apr', current_year: 67000, previous_year: 61000 },
          { month: 'May', current_year: 65000, previous_year: 59000 }
        ]
      };
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

  const summary = earningsData?.summary;
  const trends = earningsData?.trends || [];
  const breakdown = earningsData?.breakdown || [];
  const paymentMethods = earningsData?.payment_methods || [];
  const monthlyComparison = earningsData?.monthly_comparison || [];

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
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Earnings Summary</h1>
            <p className="text-[#64748B]">Comprehensive overview of your earnings and financial performance</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="border-[#E2E8F0] hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/doctor/earnings/transactions')}
              className="border-[#E2E8F0] hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Transactions
            </Button>
            <Button className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </motion.div>

        {/* Time Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2"
        >
          {[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
            { value: 'year', label: 'This Year' }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setTimeFilter(filter.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                timeFilter === filter.value
                  ? "bg-[#0EA5E9] text-white shadow-md"
                  : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Today's Earnings */}
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
                  <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                    <ArrowUpRight className="w-4 h-4" />
                    {summary?.growth_percentage}%
                  </div>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Today's Earnings</p>
                <p className="text-3xl font-bold text-[#0F172A]">₹{summary?.today?.toLocaleString()}</p>
                <p className="text-xs text-[#64748B] mt-2">vs yesterday</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly Earnings */}
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
                    This Month
                  </Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Monthly Earnings</p>
                <p className="text-3xl font-bold text-[#0F172A]">₹{summary?.month?.toLocaleString()}</p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-[#64748B] mb-1">
                    <span>Goal Progress</span>
                    <span>{summary?.goal_progress}%</span>
                  </div>
                  <Progress value={summary?.goal_progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Average per Appointment */}
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
                  <div className="text-right">
                    <p className="text-xs text-[#64748B]">Appointments</p>
                    <p className="text-sm font-bold text-[#0F172A]">{summary?.total_appointments}</p>
                  </div>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Avg per Appointment</p>
                <p className="text-3xl font-bold text-[#0F172A]">₹{summary?.avg_per_appointment?.toLocaleString()}</p>
                <p className="text-xs text-[#64748B] mt-2">
                  {summary?.completed_appointments} completed
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
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-sm text-[#64748B] mb-1">Pending Payments</p>
                <p className="text-3xl font-bold text-[#0F172A]">₹{summary?.pending?.toLocaleString()}</p>
                <p className="text-xs text-orange-600 mt-2">Awaiting collection</p>
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
            <TabsTrigger value="goals">Goals</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Earnings Trend */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#0EA5E9]" />
                    Earnings Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'earnings' ? `₹${value}` : value,
                            name === 'earnings' ? 'Earnings' : 'Appointments'
                          ]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="earnings" 
                          stroke="#0EA5E9" 
                          fill="#0EA5E9" 
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Breakdown */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-[#8B5CF6]" />
                    Revenue Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={breakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="amount"
                        >
                          {breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₹${value}`} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {breakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-[#64748B]">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#0F172A]">₹{item.amount.toLocaleString()}</p>
                          <p className="text-xs text-[#64748B]">{item.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Methods */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#22C55E]" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {paymentMethods.map((method, index) => (
                    <div key={index} className="text-center p-6 bg-[#F8FAFC] rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-white mx-auto mb-4 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-[#0EA5E9]" />
                      </div>
                      <h3 className="font-semibold text-[#0F172A] mb-2">{method.method}</h3>
                      <p className="text-2xl font-bold text-[#0EA5E9] mb-1">₹{method.amount.toLocaleString()}</p>
                      <p className="text-sm text-[#64748B]">{method.count} transactions</p>
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
                <CardTitle className="text-lg font-bold text-[#0F172A]">Monthly Comparison</CardTitle>
                <p className="text-sm text-[#64748B]">Compare current year vs previous year earnings</p>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyComparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => `₹${value}`} />
                      <Bar dataKey="current_year" fill="#0EA5E9" name="2024" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="previous_year" fill="#94A3B8" name="2023" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {breakdown.map((category, index) => (
                <Card key={index} className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center justify-between">
                      {category.category}
                      <Badge style={{ backgroundColor: category.color, color: 'white' }}>
                        {category.percentage}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <p className="text-3xl font-bold text-[#0F172A] mb-2">
                        ₹{category.amount.toLocaleString()}
                      </p>
                      <Progress 
                        value={category.percentage} 
                        className="h-3 mb-2"
                        style={{ 
                          '--progress-background': category.color 
                        } as React.CSSProperties}
                      />
                      <p className="text-sm text-[#64748B]">
                        {category.percentage}% of total revenue
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#22C55E]" />
                  Monthly Goal Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-32 h-32 rounded-full border-8 border-[#22C55E] border-t-[#E2E8F0] mx-auto mb-6 flex items-center justify-center relative">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#0F172A]">{summary?.goal_progress}%</p>
                      <p className="text-xs text-[#64748B]">Complete</p>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A] mb-2">
                    ₹{summary?.month?.toLocaleString()} / ₹{summary?.monthly_goal?.toLocaleString()}
                  </h3>
                  <p className="text-[#64748B] mb-6">
                    You're ₹{((summary?.monthly_goal || 0) - (summary?.month || 0)).toLocaleString()} away from your monthly goal
                  </p>
                  <div className="flex justify-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#22C55E]">₹{summary?.month?.toLocaleString()}</p>
                      <p className="text-sm text-[#64748B]">Earned</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#64748B]">
                        ₹{((summary?.monthly_goal || 0) - (summary?.month || 0)).toLocaleString()}
                      </p>
                      <p className="text-sm text-[#64748B]">Remaining</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}




