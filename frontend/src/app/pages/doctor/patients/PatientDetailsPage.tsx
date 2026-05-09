import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import { useAuthStore } from '@/lib/store';
import { getWebSocketManager } from '@/app/services/websocket';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Clock, AlertTriangle,
  Heart, Activity, Thermometer, Zap, FileText, Pill, TestTube,
  User, Edit, MessageCircle, Video, Plus, Download, Share,
  ChevronRight, Star, Flag, Shield, Eye, Stethoscope
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useWebSocket } from '@/app/contexts/WebSocketContext';

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  emergency_contact: string;
  insurance_provider: string;
  mrn: string;
  avatar_url?: string;
  risk_level: 'low' | 'medium' | 'high';
  last_visit: string;
  next_appointment?: string;
  allergies: string[];
  chronic_conditions: string[];
  current_medications: any[];
  recent_vitals: any;
  lab_results: any[];
  appointments_count: number;
  adherence_score: number;
}



export default function PatientDetailsPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { send } = useWebSocket();
  const [activeTab, setActiveTab] = useState('overview');
  const [collaborators, setCollaborators] = useState<any[]>([]);

  useEffect(() => {
    const setupCollaboration = async () => {
      try {
        const manager = getWebSocketManager();
        if (manager) {
          const conn = await manager.connect('presence');
          
          // Signal we are viewing
          conn.send('view_page', { 
            page: 'patient_details', 
            id: patientId, 
            user: { id: user?.id, name: user?.name || user?.email } 
          });

          // Listen for others viewing
          conn.on('user_viewing_page', (data) => {
            if (data.page === 'patient_details' && data.id === patientId && data.user.id !== user?.id) {
              setCollaborators(prev => {
                const exists = prev.find(c => c.id === data.user.id);
                if (exists) return prev;
                toast.info(`${data.user.name} is also viewing this patient`);
                return [...prev, data.user];
              });
            }
          });

          // Listen for users leaving
          conn.on('user_stopped_viewing', (data) => {
            if (data.page === 'patient_details' && data.id === patientId) {
              setCollaborators(prev => prev.filter(c => c.id !== data.user_id));
            }
          });
        }
      } catch (err) {
        console.error("Collaboration setup failed:", err);
      }
    };

    setupCollaboration();
  }, [patientId, user?.id, user?.name, user?.email]);

  // Mock API call - replace with actual API
  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient-details', patientId],
    queryFn: async () => {
      // Mock patient data
      return {
        id: patientId,
        full_name: 'Priya Sharma',
        email: 'priya.sharma@email.com',
        phone: '+91 98765 43210',
        date_of_birth: '1985-03-15',
        gender: 'Female',
        address: '123 MG Road, Bangalore, Karnataka 560001',
        emergency_contact: '+91 98765 43211 (Husband - Raj Sharma)',
        insurance_provider: 'Star Health Insurance',
        mrn: 'MRN-2024-001234',
        avatar_url: null,
        risk_level: 'medium' as const,
        last_visit: '2024-05-01',
        next_appointment: '2024-05-15T10:00:00Z',
        allergies: ['Penicillin', 'Shellfish'],
        chronic_conditions: ['Hypertension', 'Type 2 Diabetes'],
        current_medications: [
          { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
          { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' },
          { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily' }
        ],
        recent_vitals: {
          blood_pressure: '140/90',
          heart_rate: 78,
          temperature: 98.6,
          weight: 65,
          height: 162,
          bmi: 24.8,
          oxygen_saturation: 98
        },
        lab_results: [
          { test: 'HbA1c', value: '7.2%', date: '2024-04-20', status: 'elevated' },
          { test: 'Cholesterol', value: '220 mg/dL', date: '2024-04-20', status: 'elevated' },
          { test: 'Creatinine', value: '1.0 mg/dL', date: '2024-04-20', status: 'normal' }
        ],
        appointments_count: 12,
        adherence_score: 85
      } as Patient;
    }
  });

  useEffect(() => {
    const setupRealtime = async () => {
      try {
        const manager = getWebSocketManager();
        if (manager) {
          const conn = await manager.connect('notifications');
          conn.on('vitals_update', (data) => {
            if (data.patient_id === patientId) {
              queryClient.invalidateQueries({ queryKey: ['patient-details', patientId] });
              toast.info(`Vitals updated for ${patient?.full_name || 'patient'}`);
            }
          });
          conn.on('lab_update', (data) => {
            if (data.patient_id === patientId) {
              queryClient.invalidateQueries({ queryKey: ['patient-details', patientId] });
              toast.success(`New lab results available`);
            }
          });
        }
      } catch (err) {
        console.error("Failed to setup real-time patient updates:", err);
      }
    };
    setupRealtime();
  }, [patientId, queryClient, patient?.full_name]);

  // Mock vital trends data
  const vitalTrends = [
    { date: '2024-01', bp_systolic: 135, bp_diastolic: 85, weight: 67, hba1c: 7.5 },
    { date: '2024-02', bp_systolic: 138, bp_diastolic: 88, weight: 66, hba1c: 7.3 },
    { date: '2024-03', bp_systolic: 142, bp_diastolic: 92, weight: 65, hba1c: 7.2 },
    { date: '2024-04', bp_systolic: 140, bp_diastolic: 90, weight: 65, hba1c: 7.2 },
    { date: '2024-05', bp_systolic: 138, bp_diastolic: 88, weight: 64, hba1c: 7.1 }
  ];

  const recentAppointments = [
    { date: '2024-05-01', type: 'Follow-up', diagnosis: 'Diabetes Management', status: 'completed' },
    { date: '2024-04-15', type: 'Consultation', diagnosis: 'Hypertension Review', status: 'completed' },
    { date: '2024-03-20', type: 'Lab Review', diagnosis: 'Routine Check-up', status: 'completed' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="w-[300px] h-[40px]" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[400px] rounded-xl" />
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-[200px] rounded-xl" />
              <Skeleton className="h-[300px] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Patient Not Found</h2>
          <p className="text-[#64748B] mb-6">The patient you're looking for doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate('/doctor/patients')} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Back to Patients
          </Button>
        </div>
      </div>
    );
  }

  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
  const riskColor = patient.risk_level === 'high' ? 'text-red-600 bg-red-100' : 
                   patient.risk_level === 'medium' ? 'text-yellow-600 bg-yellow-100' : 
                   'text-green-600 bg-green-100';

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
              onClick={() => navigate('/doctor/patients')}
              className="p-2 hover:bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Patient Details</h1>
              <div className="flex items-center gap-3">
                <p className="text-[#64748B]">Comprehensive patient information and medical history</p>
                {collaborators.length > 0 && (
                  <div className="flex -space-x-2 overflow-hidden ml-2">
                    {collaborators.map((c, i) => (
                      <div 
                        key={i} 
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-sky-100 flex items-center justify-center"
                        title={`${c.name} is viewing`}
                      >
                        <span className="text-[10px] font-bold text-sky-700">{c.name?.[0]}</span>
                      </div>
                    ))}
                    <span className="ml-3 text-xs font-medium text-sky-600 animate-pulse">
                      {collaborators.length} others viewing
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/doctor/patients/${patientId}/timeline`)}
              className="border-[#E2E8F0] hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
            >
              <Eye className="w-4 h-4 mr-2" />
              Timeline
            </Button>
            <Button
              onClick={() => navigate(`/doctor/consultation/new?patientId=${patientId}`)}
              className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            >
              <Video className="w-4 h-4 mr-2" />
              Start Consultation
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Patient Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={patient.avatar_url} />
                    <AvatarFallback className="bg-[#0EA5E9]/10 text-[#0EA5E9] text-2xl font-bold">
                      {patient.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A] mb-1">{patient.full_name}</h2>
                  <p className="text-[#64748B] text-sm mb-2">{age} years • {patient.gender}</p>
                  <Badge className={`${riskColor} border-0 font-medium`}>
                    {patient.risk_level.toUpperCase()} RISK
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-4 h-4 text-[#64748B]" />
                    <span className="text-[#64748B]">MRN:</span>
                    <span className="font-medium text-[#0F172A]">{patient.mrn}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-[#64748B]" />
                    <span className="text-[#0F172A] truncate">{patient.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-[#64748B]" />
                    <span className="text-[#0F172A]">{patient.phone}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-[#64748B] mt-0.5" />
                    <span className="text-[#0F172A] leading-relaxed">{patient.address}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-semibold text-[#0F172A]">Quick Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-[#F8FAFC] rounded-lg">
                      <p className="text-2xl font-bold text-[#0EA5E9]">{patient.appointments_count}</p>
                      <p className="text-xs text-[#64748B]">Total Visits</p>
                    </div>
                    <div className="text-center p-3 bg-[#F8FAFC] rounded-lg">
                      <p className="text-2xl font-bold text-[#22C55E]">{patient.adherence_score}%</p>
                      <p className="text-xs text-[#64748B]">Adherence</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-[#E2E8F0] hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Message
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-[#E2E8F0] hover:border-[#22C55E] hover:text-[#22C55E]"
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    Call
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="vitals">Vitals</TabsTrigger>
                <TabsTrigger value="medications">Medications</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                
                {/* Current Vitals */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <Activity className="w-5 h-5 text-[#0EA5E9]" />
                      Current Vitals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg">
                        <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
                        <p className="text-lg font-bold text-[#0F172A]">{patient.recent_vitals.blood_pressure}</p>
                        <p className="text-xs text-[#64748B]">Blood Pressure</p>
                      </div>
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg">
                        <Zap className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-lg font-bold text-[#0F172A]">{patient.recent_vitals.heart_rate}</p>
                        <p className="text-xs text-[#64748B]">Heart Rate (bpm)</p>
                      </div>
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg">
                        <Thermometer className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                        <p className="text-lg font-bold text-[#0F172A]">{patient.recent_vitals.temperature}°F</p>
                        <p className="text-xs text-[#64748B]">Temperature</p>
                      </div>
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg">
                        <Activity className="w-6 h-6 text-green-500 mx-auto mb-2" />
                        <p className="text-lg font-bold text-[#0F172A]">{patient.recent_vitals.bmi}</p>
                        <p className="text-xs text-[#64748B]">BMI</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Alerts & Conditions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Allergies & Conditions */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Allergies & Conditions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-[#0F172A] mb-2">Allergies</h4>
                        <div className="flex flex-wrap gap-2">
                          {patient.allergies.map((allergy, index) => (
                            <Badge key={index} variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                              {allergy}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#0F172A] mb-2">Chronic Conditions</h4>
                        <div className="flex flex-wrap gap-2">
                          {patient.chronic_conditions.map((condition, index) => (
                            <Badge key={index} variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Lab Results */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                        <TestTube className="w-5 h-5 text-[#8B5CF6]" />
                        Recent Lab Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {patient.lab_results.map((result, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                            <div>
                              <p className="font-medium text-[#0F172A]">{result.test}</p>
                              <p className="text-sm text-[#64748B]">{result.date}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-[#0F172A]">{result.value}</p>
                              <Badge 
                                variant={result.status === 'normal' ? 'default' : 'destructive'}
                                className={result.status === 'normal' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                              >
                                {result.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Appointments */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#0EA5E9]" />
                      Recent Appointments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentAppointments.map((appointment, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center">
                              <Stethoscope className="w-5 h-5 text-[#0EA5E9]" />
                            </div>
                            <div>
                              <p className="font-medium text-[#0F172A]">{appointment.type}</p>
                              <p className="text-sm text-[#64748B]">{appointment.diagnosis}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-[#0F172A]">{appointment.date}</p>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {appointment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Vitals Tab */}
              <TabsContent value="vitals" className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A]">Vital Signs Trends</CardTitle>
                    <p className="text-sm text-[#64748B]">Track patient's vital signs over time</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={vitalTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Line type="monotone" dataKey="bp_systolic" stroke="#EF4444" strokeWidth={2} name="Systolic BP" />
                          <Line type="monotone" dataKey="weight" stroke="#0EA5E9" strokeWidth={2} name="Weight (kg)" />
                          <Line type="monotone" dataKey="hba1c" stroke="#8B5CF6" strokeWidth={2} name="HbA1c (%)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Medications Tab */}
              <TabsContent value="medications" className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <Pill className="w-5 h-5 text-[#22C55E]" />
                      Current Medications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {patient.current_medications.map((medication, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
                              <Pill className="w-5 h-5 text-[#22C55E]" />
                            </div>
                            <div>
                              <p className="font-medium text-[#0F172A]">{medication.name}</p>
                              <p className="text-sm text-[#64748B]">{medication.dosage} • {medication.frequency}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#8B5CF6]" />
                      Medical History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
                      <p className="text-[#64748B] mb-4">Detailed medical history will be displayed here</p>
                      <Button
                        onClick={() => navigate(`/doctor/patients/${patientId}/history`)}
                        className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                      >
                        View Full History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>

      </div>
    </div>
  );
}







