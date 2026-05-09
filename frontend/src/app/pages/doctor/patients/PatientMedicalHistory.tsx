import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Calendar, FileText, Pill, TestTube, Stethoscope,
  Activity, AlertTriangle, Clock, Download, Filter, Search,
  ChevronDown, ChevronRight, Eye, Edit, Plus, Heart, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MedicalEvent {
  id: string;
  date: string;
  type: 'appointment' | 'lab_result' | 'prescription' | 'diagnosis' | 'procedure' | 'vital_signs';
  title: string;
  description: string;
  provider: string;
  details: any;
  attachments?: string[];
  status: 'completed' | 'pending' | 'cancelled';
}

interface VitalRecord {
  date: string;
  blood_pressure: string;
  heart_rate: number;
  temperature: number;
  weight: number;
  height: number;
  bmi: number;
  notes?: string;
}

export default function PatientMedicalHistory() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Mock API calls - replace with actual API
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient-basic', patientId],
    queryFn: async () => ({
      id: patientId,
      full_name: 'Priya Sharma',
      mrn: 'MRN-2024-001234',
      date_of_birth: '1985-03-15',
      gender: 'Female'
    })
  });

  const { data: medicalHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['patient-medical-history', patientId],
    queryFn: async () => {
      // Mock medical history data
      return [
        {
          id: '1',
          date: '2024-05-01',
          type: 'appointment',
          title: 'Diabetes Follow-up Consultation',
          description: 'Routine diabetes management and medication review',
          provider: 'Dr. Rajesh Kumar',
          details: {
            diagnosis: 'Type 2 Diabetes Mellitus - Well controlled',
            symptoms: 'No acute symptoms reported',
            examination: 'Patient appears well, no acute distress',
            plan: 'Continue current medications, follow-up in 3 months'
          },
          status: 'completed'
        },
        {
          id: '2',
          date: '2024-04-20',
          type: 'lab_result',
          title: 'Comprehensive Metabolic Panel',
          description: 'Routine lab work for diabetes monitoring',
          provider: 'PathLab Diagnostics',
          details: {
            tests: [
              { name: 'HbA1c', value: '7.2%', range: '<7.0%', status: 'elevated' },
              { name: 'Fasting Glucose', value: '145 mg/dL', range: '70-100 mg/dL', status: 'elevated' },
              { name: 'Creatinine', value: '1.0 mg/dL', range: '0.6-1.2 mg/dL', status: 'normal' },
              { name: 'Total Cholesterol', value: '220 mg/dL', range: '<200 mg/dL', status: 'elevated' }
            ]
          },
          status: 'completed'
        },
        {
          id: '3',
          date: '2024-04-15',
          type: 'prescription',
          title: 'Medication Adjustment',
          description: 'Updated diabetes medications based on recent labs',
          provider: 'Dr. Rajesh Kumar',
          details: {
            medications: [
              { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', change: 'continued' },
              { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', change: 'increased from 5mg' },
              { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily', change: 'newly prescribed' }
            ]
          },
          status: 'completed'
        },
        {
          id: '4',
          date: '2024-03-15',
          type: 'vital_signs',
          title: 'Vital Signs Assessment',
          description: 'Routine vital signs monitoring',
          provider: 'Nurse Sarah Johnson',
          details: {
            blood_pressure: '140/90 mmHg',
            heart_rate: '78 bpm',
            temperature: '98.6°F',
            weight: '65 kg',
            height: '162 cm',
            bmi: '24.8',
            oxygen_saturation: '98%'
          },
          status: 'completed'
        },
        {
          id: '5',
          date: '2024-02-28',
          type: 'diagnosis',
          title: 'Hypertension Diagnosis',
          description: 'New diagnosis of essential hypertension',
          provider: 'Dr. Rajesh Kumar',
          details: {
            icd_code: 'I10',
            diagnosis: 'Essential (primary) hypertension',
            severity: 'Stage 1',
            notes: 'Patient presents with consistently elevated blood pressure readings over multiple visits'
          },
          status: 'completed'
        }
      ] as MedicalEvent[];
    }
  });

  const { data: vitalTrends, isLoading: vitalsLoading } = useQuery({
    queryKey: ['patient-vital-trends', patientId],
    queryFn: async () => [
      { date: '2024-01', bp_systolic: 135, bp_diastolic: 85, weight: 67, heart_rate: 75 },
      { date: '2024-02', bp_systolic: 138, bp_diastolic: 88, weight: 66, heart_rate: 78 },
      { date: '2024-03', bp_systolic: 142, bp_diastolic: 92, weight: 65, heart_rate: 80 },
      { date: '2024-04', bp_systolic: 140, bp_diastolic: 90, weight: 65, heart_rate: 78 },
      { date: '2024-05', bp_systolic: 138, bp_diastolic: 88, weight: 64, heart_rate: 76 }
    ]
  });

  const isLoading = patientLoading || historyLoading || vitalsLoading;

  // Filter medical history
  const filteredHistory = medicalHistory?.filter((event: MedicalEvent) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesDate = filterDate === 'all' || 
                       (filterDate === '30days' && new Date(event.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) ||
                       (filterDate === '90days' && new Date(event.date) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) ||
                       (filterDate === '1year' && new Date(event.date) >= new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesType && matchesDate;
  }) || [];

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Stethoscope className="w-5 h-5 text-[#0EA5E9]" />;
      case 'lab_result': return <TestTube className="w-5 h-5 text-[#8B5CF6]" />;
      case 'prescription': return <Pill className="w-5 h-5 text-[#22C55E]" />;
      case 'diagnosis': return <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />;
      case 'procedure': return <Activity className="w-5 h-5 text-[#EF4444]" />;
      case 'vital_signs': return <Heart className="w-5 h-5 text-[#EC4899]" />;
      default: return <FileText className="w-5 h-5 text-[#64748B]" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'appointment': return 'bg-[#0EA5E9]/10 border-[#0EA5E9]/20';
      case 'lab_result': return 'bg-[#8B5CF6]/10 border-[#8B5CF6]/20';
      case 'prescription': return 'bg-[#22C55E]/10 border-[#22C55E]/20';
      case 'diagnosis': return 'bg-[#F59E0B]/10 border-[#F59E0B]/20';
      case 'procedure': return 'bg-[#EF4444]/10 border-[#EF4444]/20';
      case 'vital_signs': return 'bg-[#EC4899]/10 border-[#EC4899]/20';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="w-[300px] h-[40px]" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-[120px] rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

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
              onClick={() => navigate(`/doctor/patients/${patientId}`)}
              className="p-2 hover:bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Medical History</h1>
              <p className="text-[#64748B]">
                Complete medical history for {patient?.full_name} (MRN: {patient?.mrn})
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-[#E2E8F0] hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
            >
              <Download className="w-4 h-4 mr-2" />
              Export History
            </Button>
            <Button
              onClick={() => navigate(`/doctor/patients/${patientId}/timeline`)}
              className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            >
              <Eye className="w-4 h-4 mr-2" />
              Timeline View
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main History Timeline */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            
            {/* Filters */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B] w-4 h-4" />
                    <Input
                      placeholder="Search medical history..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-[#E2E8F0] focus:border-[#0EA5E9]"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="appointment">Appointments</SelectItem>
                      <SelectItem value="lab_result">Lab Results</SelectItem>
                      <SelectItem value="prescription">Prescriptions</SelectItem>
                      <SelectItem value="diagnosis">Diagnoses</SelectItem>
                      <SelectItem value="vital_signs">Vital Signs</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterDate} onValueChange={setFilterDate}>
                    <SelectTrigger className="w-[150px]">
                      <Calendar className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                      <SelectItem value="90days">Last 90 Days</SelectItem>
                      <SelectItem value="1year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Medical Events Timeline */}
            <div className="space-y-4">
              {filteredHistory.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="text-center py-12">
                    <FileText className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No Records Found</h3>
                    <p className="text-[#64748B]">
                      {searchQuery || filterType !== 'all' || filterDate !== 'all' 
                        ? 'Try adjusting your search or filter criteria'
                        : 'No medical history available for this patient'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredHistory.map((event: MedicalEvent, index: number) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className={`border-0 shadow-sm ${getEventColor(event.type)}`}>
                      <Collapsible>
                        <CollapsibleTrigger
                          onClick={() => toggleEventExpansion(event.id)}
                          className="w-full"
                        >
                          <CardHeader className="hover:bg-white/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                                  {getEventIcon(event.type)}
                                </div>
                                <div className="text-left">
                                  <CardTitle className="text-lg font-bold text-[#0F172A]">
                                    {event.title}
                                  </CardTitle>
                                  <p className="text-sm text-[#64748B] mt-1">
                                    {new Date(event.date).toLocaleDateString()} • {event.provider}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={event.status === 'completed' ? 'default' : 'secondary'}
                                  className={event.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
                                >
                                  {event.status}
                                </Badge>
                                {expandedEvents.has(event.id) ? (
                                  <ChevronDown className="w-5 h-5 text-[#64748B]" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-[#64748B]" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <Separator className="mb-4" />
                            <div className="space-y-4">
                              <p className="text-[#64748B]">{event.description}</p>
                              
                              {/* Event-specific details */}
                              {event.type === 'appointment' && event.details && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold text-[#0F172A] mb-2">Diagnosis</h4>
                                      <p className="text-sm text-[#64748B]">{event.details.diagnosis}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-[#0F172A] mb-2">Symptoms</h4>
                                      <p className="text-sm text-[#64748B]">{event.details.symptoms}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-[#0F172A] mb-2">Treatment Plan</h4>
                                    <p className="text-sm text-[#64748B]">{event.details.plan}</p>
                                  </div>
                                </div>
                              )}

                              {event.type === 'lab_result' && event.details?.tests && (
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-[#0F172A]">Test Results</h4>
                                  <div className="grid gap-2">
                                    {event.details.tests.map((test: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg">
                                        <div>
                                          <p className="font-medium text-[#0F172A]">{test.name}</p>
                                          <p className="text-sm text-[#64748B]">Range: {test.range}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-bold text-[#0F172A]">{test.value}</p>
                                          <Badge 
                                            variant={test.status === 'normal' ? 'default' : 'destructive'}
                                            className={test.status === 'normal' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                                          >
                                            {test.status}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {event.type === 'prescription' && event.details?.medications && (
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-[#0F172A]">Medications</h4>
                                  <div className="grid gap-2">
                                    {event.details.medications.map((med: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg">
                                        <div>
                                          <p className="font-medium text-[#0F172A]">{med.name}</p>
                                          <p className="text-sm text-[#64748B]">{med.dosage} • {med.frequency}</p>
                                        </div>
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                          {med.change}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {event.type === 'vital_signs' && event.details && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {Object.entries(event.details).map(([key, value]) => (
                                    <div key={key} className="text-center p-3 bg-white rounded-lg">
                                      <p className="text-sm font-medium text-[#0F172A] capitalize">
                                        {key.replace('_', ' ')}
                                      </p>
                                      <p className="text-lg font-bold text-[#0EA5E9]">{value as string}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {event.type === 'diagnosis' && event.details && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold text-[#0F172A] mb-2">ICD Code</h4>
                                      <p className="text-sm text-[#64748B]">{event.details.icd_code}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-[#0F172A] mb-2">Severity</h4>
                                      <p className="text-sm text-[#64748B]">{event.details.severity}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-[#0F172A] mb-2">Clinical Notes</h4>
                                    <p className="text-sm text-[#64748B]">{event.details.notes}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Sidebar - Vital Trends */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            
            {/* Vital Signs Trends */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#0EA5E9]" />
                  Vital Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vitalTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="bp_systolic" stroke="#EF4444" strokeWidth={2} name="Systolic BP" />
                      <Line type="monotone" dataKey="heart_rate" stroke="#0EA5E9" strokeWidth={2} name="Heart Rate" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A]">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#E2E8F0] hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
                  onClick={() => navigate(`/doctor/patients/${patientId}`)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Patient Details
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#E2E8F0] hover:border-[#22C55E] hover:text-[#22C55E]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Entry
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#E2E8F0] hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit History
                </Button>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A]">History Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#64748B]">Total Entries</span>
                    <span className="font-bold text-[#0F172A]">{medicalHistory?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#64748B]">Appointments</span>
                    <span className="font-bold text-[#0F172A]">
                      {medicalHistory?.filter(e => e.type === 'appointment').length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#64748B]">Lab Results</span>
                    <span className="font-bold text-[#0F172A]">
                      {medicalHistory?.filter(e => e.type === 'lab_result').length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#64748B]">Prescriptions</span>
                    <span className="font-bold text-[#0F172A]">
                      {medicalHistory?.filter(e => e.type === 'prescription').length || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

      </div>
    </div>
  );
}




