import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Users, TrendingUp, MapPin, Calendar, Clock, 
  Heart, Activity, AlertTriangle, CheckCircle, Filter, Download,
  Eye, UserPlus, UserMinus, BarChart3, PieChart
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
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface PatientAnalytics {
  summary: {
    total_patients: number;
    active_patients: number;
    new_patients_this_month: number;
    returning_patients: number;
    patient_retention_rate: number;
    average_age: number;
    gender_distribution: {
      male: number;
      female: number;
      other: number;
    };
  };
  growth_trends: Array<{
    month: string;
    new_patients: number;
    returning_patients: number;
    total_active: number;
  }>;
  demographics: {
    age_groups: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    locations: Array<{
      city: string;
      count: number;
      percentage: number;
    }>;
    conditions: Array<{
      condition: string;
      count: number;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
  engagement_metrics: {
    appointment_frequency: Array<{
      frequency: string;
      count: number;
      percentage: number;
    }>;
    communication_preferences: Array<{
      method: string;
      count: number;
      percentage: number;
    }>;
    satisfaction_scores: Array<{
      score: number;
      count: number;
    }>;
  };
  health_outcomes: {
    improvement_rate: number;
    follow_up_compliance: number;
    medication_adherence: number;
    lifestyle_changes: number;
  };
  risk_analysis: Array<{
    risk_level: 'low' | 'medium' | 'high';
    count: number;
    conditions: string[];
  }>;
}
export default function DoctorPatientAnalytics() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState('year');
  const [activeTab, setActiveTab] = useState('overview');

  // API call to doctor patient analytics endpoint
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['doctor-patient-analytics', timeFilter],
    queryFn: async (): Promise<PatientAnalytics> => {
      // This connects to: GET /api/v1/doctor/analytics/patients
      const response = await fetch(`/api/v1/doctor/analytics/patients?period=${timeFilter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch patient analytics');
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
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Unable to Load Patient Analytics</h2>
          <p className="text-[#64748B] mb-6">There was an error loading your patient analytics data.</p>
          <Button onClick={() => refetch()} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/doctor/analytics')}
              className="p-2 hover:bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Patient Analytics</h1>
              <p className="text-[#64748B]">Detailed insights into your patient demographics and engagement</p>
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
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Total
                  </Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Total Patients</p>
                <p className="text-3xl font-bold text-[#0F172A]">{summary.total_patients.toLocaleString()}</p>
                <p className="text-xs text-[#64748B] mt-2">
                  {summary.active_patients} active patients
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* New Patients */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-green-600" />
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    New
                  </Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">New This Month</p>
                <p className="text-3xl font-bold text-[#0F172A]">{summary.new_patients_this_month}</p>
                <p className="text-xs text-[#64748B] mt-2">
                  {Math.round((summary.new_patients_this_month / summary.total_patients) * 100)}% of total
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Retention Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    Retention
                  </Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Retention Rate</p>
                <p className="text-3xl font-bold text-[#0F172A]">{summary.patient_retention_rate}%</p>
                <div className="mt-2">
                  <Progress value={summary.patient_retention_rate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Average Age */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-orange-600" />
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    Age
                  </Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Average Age</p>
                <p className="text-3xl font-bold text-[#0F172A]">{summary.average_age}</p>
                <p className="text-xs text-[#64748B] mt-2">
                  years old
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Patient Growth Trends */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#0EA5E9]" />
                    Patient Growth Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.growth_trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="new_patients" 
                          stackId="1"
                          stroke="#22C55E" 
                          fill="#22C55E" 
                          fillOpacity={0.6}
                          name="New Patients"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="returning_patients" 
                          stackId="1"
                          stroke="#0EA5E9" 
                          fill="#0EA5E9" 
                          fillOpacity={0.6}
                          name="Returning Patients"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Gender Distribution */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#8B5CF6]" />
                    Gender Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Male', value: summary.gender_distribution.male },
                            { name: 'Female', value: summary.gender_distribution.female },
                            { name: 'Other', value: summary.gender_distribution.other }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[summary.gender_distribution.male, summary.gender_distribution.female, summary.gender_distribution.other].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: 'Male', value: summary.gender_distribution.male },
                      { name: 'Female', value: summary.gender_distribution.female },
                      { name: 'Other', value: summary.gender_distribution.other }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index] }}
                          />
                          <span className="text-sm text-[#64748B]">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#0F172A]">{item.value}</p>
                          <p className="text-xs text-[#64748B]">
                            {Math.round((item.value / summary.total_patients) * 100)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Age Groups */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#0EA5E9]" />
                    Age Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.demographics.age_groups}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="range" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Geographic Distribution */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#22C55E]" />
                    Geographic Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.demographics.locations.map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-[#22C55E]" />
                          </div>
                          <span className="font-medium text-[#0F172A]">{location.city}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#0F172A]">{location.count}</p>
                          <p className="text-sm text-[#64748B]">{location.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Common Conditions */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#8B5CF6]" />
                  Common Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analytics.demographics.conditions.map((condition, index) => (
                    <div key={index} className="p-4 border border-[#E2E8F0] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-[#0F172A]">{condition.condition}</h3>
                        <Badge 
                          variant="secondary" 
                          className={
                            condition.severity === 'high' ? 'bg-red-100 text-red-700' :
                            condition.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }
                        >
                          {condition.severity}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-[#0EA5E9] mb-1">{condition.count}</p>
                      <p className="text-sm text-[#64748B]">patients affected</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Appointment Frequency */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#0EA5E9]" />
                    Appointment Frequency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.engagement_metrics.appointment_frequency.map((freq, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-[#64748B]">{freq.frequency}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-[#F1F5F9] rounded-full h-2">
                            <div 
                              className="bg-[#0EA5E9] h-2 rounded-full" 
                              style={{ width: `${freq.percentage}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#0F172A] w-12 text-right">{freq.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Communication Preferences */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-[#22C55E]" />
                    Communication Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={analytics.engagement_metrics.communication_preferences}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                        >
                          {analytics.engagement_metrics.communication_preferences.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {analytics.engagement_metrics.communication_preferences.map((pref, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-[#64748B]">{pref.method}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#0F172A]">{pref.count}</p>
                          <p className="text-xs text-[#64748B]">{pref.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Satisfaction Scores */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#F59E0B]" />
                  Patient Satisfaction Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.engagement_metrics.satisfaction_scores}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="score" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outcomes Tab */}
          <TabsContent value="outcomes" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(analytics.health_outcomes).map(([key, value], index) => (
                <Card key={key} className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A] capitalize flex items-center gap-2">
                      <Heart className="w-5 h-5 text-[#EF4444]" />
                      {key.replace('_', ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <p className="text-4xl font-bold text-[#0EA5E9] mb-4">{value}%</p>
                      <Progress value={value} className="h-3 mb-4" />
                      <p className="text-sm text-[#64748B]">
                        {value >= 80 ? 'Excellent Performance' : 
                         value >= 60 ? 'Good Performance' : 
                         'Needs Improvement'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Risk Analysis */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                  Patient Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {analytics.risk_analysis.map((risk, index) => (
                    <div key={index} className="text-center p-6 bg-[#F8FAFC] rounded-xl">
                      <div className={`w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center ${
                        risk.risk_level === 'high' ? 'bg-red-100' :
                        risk.risk_level === 'medium' ? 'bg-yellow-100' :
                        'bg-green-100'
                      }`}>
                        <AlertTriangle className={`w-8 h-8 ${
                          risk.risk_level === 'high' ? 'text-red-600' :
                          risk.risk_level === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <h3 className="font-semibold text-[#0F172A] mb-2 capitalize">{risk.risk_level} Risk</h3>
                      <p className="text-3xl font-bold text-[#0EA5E9] mb-2">{risk.count}</p>
                      <p className="text-sm text-[#64748B] mb-3">patients</p>
                      <div className="space-y-1">
                        {risk.conditions.slice(0, 3).map((condition, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {condition}
                          </Badge>
                        ))}
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




