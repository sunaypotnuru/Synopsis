import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, CheckCircle, XCircle, FileText, Download, Eye, Shield,
  User, Mail, Phone, MapPin, Calendar, Award, Building, AlertTriangle,
  Clock, Upload, ExternalLink, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface DoctorVerification {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  specialization?: string;
  license_number?: string;
  license_state?: string;
  license_expiry?: string;
  medical_school?: string;
  graduation_year?: string;
  years_of_experience?: number;
  hospital_affiliation?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_notes?: string;
  documents?: {
    license?: string;
    degree?: string;
    identity?: string;
    certification?: string;
  };
  created_at: string;
  updated_at: string;
}

export default function DoctorVerificationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [verificationNotes, setVerificationNotes] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  // Fetch doctor details
  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor-verification', id],
    queryFn: async (): Promise<DoctorVerification> => {
      const response = await fetch(`/api/v1/admin/doctors/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch doctor details');
      }
      
      return response.json();
    },
    enabled: !!id
  });

  // Verify doctor mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: 'verified' | 'rejected'; notes: string }) => {
      const response = await fetch(`/api/v1/admin/doctors/${id}/verify`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          verification_status: status,
          verification_notes: notes
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update verification status');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-verification', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] });
      toast.success(`Doctor ${variables.status === 'verified' ? 'verified' : 'rejected'} successfully`);
      navigate('/admin/doctors');
    },
    onError: () => {
      toast.error('Failed to update verification status');
    }
  });

  const handleVerify = (status: 'verified' | 'rejected') => {
    if (!verificationNotes.trim() && status === 'rejected') {
      toast.error('Please provide rejection reason');
      return;
    }
    verifyMutation.mutate({ status, notes: verificationNotes });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="w-[300px] h-[40px]" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-[500px] rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-[300px] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Doctor Not Found</h2>
          <p className="text-[#64748B] mb-6">The doctor you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/admin/doctors')} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Back to Doctors
          </Button>
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
              onClick={() => navigate('/admin/doctors')}
              className="hover:bg-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A] mb-2">
                Doctor Verification
              </h1>
              <p className="text-[#64748B]">
                Review and verify doctor credentials
              </p>
            </div>
          </div>
          <Badge className={`${getStatusColor(doctor.verification_status)} border-0 text-sm px-4 py-2`}>
            {doctor.verification_status.charAt(0).toUpperCase() + doctor.verification_status.slice(1)}
          </Badge>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Doctor Info & Documents */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Doctor Information */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0EA5E9]" />
                  Doctor Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="professional">Professional</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="personal" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#64748B]">Full Name</Label>
                        <p className="text-[#0F172A] font-medium mt-1">
                          Dr. {doctor.first_name} {doctor.last_name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-[#64748B]">Email</Label>
                        <p className="text-[#0F172A] font-medium mt-1">{doctor.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#64748B]">Phone</Label>
                        <p className="text-[#0F172A] font-medium mt-1">{doctor.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-[#64748B]">Specialization</Label>
                        <p className="text-[#0F172A] font-medium mt-1">{doctor.specialization || 'Not specified'}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[#64748B]">Address</Label>
                      <p className="text-[#0F172A] font-medium mt-1">
                        {doctor.address || 'Not provided'}
                        {doctor.city && `, ${doctor.city}`}
                        {doctor.state && `, ${doctor.state}`}
                        {doctor.zip_code && ` ${doctor.zip_code}`}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="professional" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#64748B]">License Number</Label>
                        <p className="text-[#0F172A] font-medium mt-1">{doctor.license_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-[#64748B]">License State</Label>
                        <p className="text-[#0F172A] font-medium mt-1">{doctor.license_state || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#64748B]">License Expiry</Label>
                        <p className="text-[#0F172A] font-medium mt-1">
                          {doctor.license_expiry 
                            ? new Date(doctor.license_expiry).toLocaleDateString()
                            : 'Not provided'
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-[#64748B]">Years of Experience</Label>
                        <p className="text-[#0F172A] font-medium mt-1">
                          {doctor.years_of_experience || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[#64748B]">Medical School</Label>
                      <p className="text-[#0F172A] font-medium mt-1">{doctor.medical_school || 'Not provided'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#64748B]">Graduation Year</Label>
                        <p className="text-[#0F172A] font-medium mt-1">{doctor.graduation_year || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-[#64748B]">Hospital Affiliation</Label>
                        <p className="text-[#0F172A] font-medium mt-1">{doctor.hospital_affiliation || 'Not provided'}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4 mt-6">
                    {doctor.documents && Object.keys(doctor.documents).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(doctor.documents).map(([type, url]) => (
                          <div key={type} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg border">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-[#0EA5E9]" />
                              <div>
                                <p className="font-medium text-[#0F172A]">
                                  {type.charAt(0).toUpperCase() + type.slice(1)} Document
                                </p>
                                <p className="text-xs text-[#64748B]">Uploaded document</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedDocument(url as string)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(url as string, '_blank')}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Upload className="w-12 h-12 text-[#64748B] mx-auto mb-3" />
                        <p className="text-[#64748B]">No documents uploaded</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Verification Notes */}
            {doctor.verification_status === 'pending' && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#0EA5E9]" />
                    Verification Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add notes about the verification process, reasons for approval/rejection, or any concerns..."
                    className="min-h-[120px]"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                  />
                  <p className="text-xs text-[#64748B] mt-2">
                    These notes will be saved with the verification decision
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Previous Verification Notes */}
            {doctor.verification_notes && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#0EA5E9]" />
                    Previous Verification Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#64748B] whitespace-pre-wrap">{doctor.verification_notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Actions & Status */}
          <div className="space-y-6">
            
            {/* Quick Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#64748B]" />
                    <span className="text-sm text-[#64748B]">Applied</span>
                  </div>
                  <span className="text-sm font-medium text-[#0F172A]">
                    {new Date(doctor.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#64748B]" />
                    <span className="text-sm text-[#64748B]">Last Updated</span>
                  </div>
                  <span className="text-sm font-medium text-[#0F172A]">
                    {new Date(doctor.updated_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#64748B]" />
                    <span className="text-sm text-[#64748B]">Status</span>
                  </div>
                  <Badge className={`${getStatusColor(doctor.verification_status)} border-0`}>
                    {doctor.verification_status.charAt(0).toUpperCase() + doctor.verification_status.slice(1)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Verification Actions */}
            {doctor.verification_status === 'pending' && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Verification Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        className="w-full bg-green-500 hover:bg-green-600 text-white"
                        disabled={verifyMutation.isPending}
                      >
                        {verifyMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Verify Doctor
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Verify Doctor</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to verify Dr. {doctor.first_name} {doctor.last_name}? 
                          This will grant them full access to the doctor portal.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleVerify('verified')}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          Verify
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full border-red-500 text-red-500 hover:bg-red-50"
                        disabled={verifyMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Application
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Application</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to reject this application? 
                          Please make sure you've added rejection notes explaining the reason.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleVerify('rejected')}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Reject
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}

            {/* Verification Checklist */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Verification Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {doctor.license_number ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-[#64748B]">License Number Provided</span>
                </div>
                <div className="flex items-center gap-2">
                  {doctor.medical_school ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-[#64748B]">Medical School Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  {doctor.documents && Object.keys(doctor.documents).length > 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-[#64748B]">Documents Uploaded</span>
                </div>
                <div className="flex items-center gap-2">
                  {doctor.specialization ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-[#64748B]">Specialization Specified</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
          onClick={() => setSelectedDocument(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Document Preview</h3>
              <Button variant="ghost" onClick={() => setSelectedDocument(null)}>
                <XCircle className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6">
              <img 
                src={selectedDocument} 
                alt="Document" 
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
