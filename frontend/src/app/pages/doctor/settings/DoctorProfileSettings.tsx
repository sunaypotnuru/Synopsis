import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, User, Mail, Phone, MapPin, Calendar, Camera, 
  Save, Edit, Shield, Award, Clock, Globe, FileText,
  CheckCircle, AlertCircle, Upload, X, Plus, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

interface DoctorProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  avatar_url?: string;
  medical_license: string;
  specializations: string[];
  qualifications: string[];
  experience_years: number;
  languages: string[];
  bio: string;
  consultation_fee: number;
  follow_up_fee: number;
  emergency_fee: number;
  clinic_name: string;
  clinic_address: string;
  clinic_phone: string;
  website?: string;
  social_media: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  availability_status: 'available' | 'busy' | 'offline';
  auto_accept_appointments: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
}

export default function DoctorProfileSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<DoctorProfile>>({});

  // Mock API call - replace with actual API
  const { data: profile, isLoading } = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: async (): Promise<DoctorProfile> => {
      // Mock profile data
      return {
        id: 'doc1',
        full_name: 'Dr. Rajesh Kumar',
        email: 'rajesh.kumar@netra.ai',
        phone: '+91 98765 43210',
        date_of_birth: '1980-05-15',
        gender: 'Male',
        address: '123 Medical Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        country: 'India',
        avatar_url: null,
        medical_license: 'MH-12345-2005',
        specializations: ['Cardiology', 'Internal Medicine'],
        qualifications: ['MBBS', 'MD Cardiology', 'Fellowship in Interventional Cardiology'],
        experience_years: 15,
        languages: ['English', 'Hindi', 'Marathi'],
        bio: 'Experienced cardiologist with 15+ years of practice. Specialized in interventional cardiology and preventive heart care.',
        consultation_fee: 1500,
        follow_up_fee: 800,
        emergency_fee: 3000,
        clinic_name: 'Heart Care Clinic',
        clinic_address: '456 Health Avenue, Mumbai',
        clinic_phone: '+91 22 1234 5678',
        website: 'https://heartcareclinic.com',
        social_media: {
          linkedin: 'https://linkedin.com/in/drrajeshkumar',
          twitter: 'https://twitter.com/drrajeshkumar'
        },
        availability_status: 'available',
        auto_accept_appointments: true,
        email_notifications: true,
        sms_notifications: true,
        push_notifications: true
      };
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updatedProfile: Partial<DoctorProfile>) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return updatedProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
      setIsEditing(false);
    }
  });

  const handleInputChange = (field: keyof DoctorProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleEdit = () => {
    setFormData(profile || {});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({});
    setIsEditing(false);
  };
  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-4xl mx-auto space-y-8">
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

  if (!profile) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Profile Not Found</h2>
          <p className="text-[#64748B] mb-6">Unable to load your profile information.</p>
          <Button onClick={() => navigate('/doctor/dashboard')} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentData = isEditing ? { ...profile, ...formData } : profile;
  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/doctor/settings')}
              className="p-2 hover:bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Profile Settings</h1>
              <p className="text-[#64748B]">Manage your professional profile and personal information</p>
            </div>
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="border-[#E2E8F0] hover:border-[#EF4444] hover:text-[#EF4444]"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateProfileMutation.isPending}
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEdit}
                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Profile Summary Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="relative mb-6">
                  <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage src={currentData.avatar_url} />
                    <AvatarFallback className="bg-[#0EA5E9]/10 text-[#0EA5E9] text-2xl font-bold">
                      {currentData.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="sm"
                      className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B]"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-[#0F172A] mb-2">{currentData.full_name}</h2>
                <p className="text-[#64748B] text-sm mb-4">{currentData.specializations.join(', ')}</p>
                
                <div className="flex justify-center mb-4">
                  <Badge 
                    className={`${
                      currentData.availability_status === 'available' ? 'bg-green-100 text-green-700' :
                      currentData.availability_status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    } border-0`}
                  >
                    {currentData.availability_status.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Experience</span>
                    <span className="font-medium text-[#0F172A]">{currentData.experience_years} years</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">License</span>
                    <span className="font-medium text-[#0F172A]">{currentData.medical_license}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Languages</span>
                    <span className="font-medium text-[#0F172A]">{currentData.languages.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="professional">Professional</TabsTrigger>
                <TabsTrigger value="clinic">Clinic</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <User className="w-5 h-5 text-[#0EA5E9]" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">Full Name</label>
                        {isEditing ? (
                          <Input
                            value={currentData.full_name}
                            onChange={(e) => handleInputChange('full_name', e.target.value)}
                            className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          />
                        ) : (
                          <p className="text-[#64748B] py-2">{currentData.full_name}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">Email</label>
                        {isEditing ? (
                          <Input
                            type="email"
                            value={currentData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          />
                        ) : (
                          <p className="text-[#64748B] py-2">{currentData.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">Phone</label>
                        {isEditing ? (
                          <Input
                            value={currentData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          />
                        ) : (
                          <p className="text-[#64748B] py-2">{currentData.phone}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">Date of Birth</label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={currentData.date_of_birth}
                            onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                            className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          />
                        ) : (
                          <p className="text-[#64748B] py-2">
                            {new Date(currentData.date_of_birth).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">Gender</label>
                        {isEditing ? (
                          <Select value={currentData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-[#64748B] py-2">{currentData.gender}</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Address</label>
                      {isEditing ? (
                        <Textarea
                          value={currentData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          rows={3}
                        />
                      ) : (
                        <p className="text-[#64748B] py-2">{currentData.address}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">City</label>
                        {isEditing ? (
                          <Input
                            value={currentData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          />
                        ) : (
                          <p className="text-[#64748B] py-2">{currentData.city}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">State</label>
                        {isEditing ? (
                          <Input
                            value={currentData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          />
                        ) : (
                          <p className="text-[#64748B] py-2">{currentData.state}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">Postal Code</label>
                        {isEditing ? (
                          <Input
                            value={currentData.postal_code}
                            onChange={(e) => handleInputChange('postal_code', e.target.value)}
                            className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          />
                        ) : (
                          <p className="text-[#64748B] py-2">{currentData.postal_code}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* Professional Information Tab */}
              <TabsContent value="professional" className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <Award className="w-5 h-5 text-[#22C55E]" />
                      Professional Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">Medical License</label>
                        {isEditing ? (
                          <Input
                            value={currentData.medical_license}
                            onChange={(e) => handleInputChange('medical_license', e.target.value)}
                            className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          />
                        ) : (
                          <p className="text-[#64748B] py-2">{currentData.medical_license}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">Experience (Years)</label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={currentData.experience_years}
                            onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value))}
                            className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          />
                        ) : (
                          <p className="text-[#64748B] py-2">{currentData.experience_years} years</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Specializations</label>
                      {isEditing ? (
                        <div className="space-y-2">
                          {currentData.specializations.map((spec, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                value={spec}
                                onChange={(e) => {
                                  const newSpecs = [...currentData.specializations];
                                  newSpecs[index] = e.target.value;
                                  handleInputChange('specializations', newSpecs);
                                }}
                                className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newSpecs = currentData.specializations.filter((_, i) => i !== index);
                                  handleInputChange('specializations', newSpecs);
                                }}
                                className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleInputChange('specializations', [...currentData.specializations, '']);
                            }}
                            className="border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E] hover:text-white"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Specialization
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {currentData.specializations.map((spec, index) => (
                            <Badge key={index} variant="secondary" className="bg-[#0EA5E9]/10 text-[#0EA5E9]">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Qualifications</label>
                      {isEditing ? (
                        <div className="space-y-2">
                          {currentData.qualifications.map((qual, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                value={qual}
                                onChange={(e) => {
                                  const newQuals = [...currentData.qualifications];
                                  newQuals[index] = e.target.value;
                                  handleInputChange('qualifications', newQuals);
                                }}
                                className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newQuals = currentData.qualifications.filter((_, i) => i !== index);
                                  handleInputChange('qualifications', newQuals);
                                }}
                                className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleInputChange('qualifications', [...currentData.qualifications, '']);
                            }}
                            className="border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E] hover:text-white"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Qualification
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {currentData.qualifications.map((qual, index) => (
                            <Badge key={index} variant="secondary" className="bg-[#22C55E]/10 text-[#22C55E]">
                              {qual}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Languages</label>
                      {isEditing ? (
                        <div className="space-y-2">
                          {currentData.languages.map((lang, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                value={lang}
                                onChange={(e) => {
                                  const newLangs = [...currentData.languages];
                                  newLangs[index] = e.target.value;
                                  handleInputChange('languages', newLangs);
                                }}
                                className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newLangs = currentData.languages.filter((_, i) => i !== index);
                                  handleInputChange('languages', newLangs);
                                }}
                                className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleInputChange('languages', [...currentData.languages, '']);
                            }}
                            className="border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E] hover:text-white"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Language
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {currentData.languages.map((lang, index) => (
                            <Badge key={index} variant="secondary" className="bg-[#8B5CF6]/10 text-[#8B5CF6]">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Professional Bio</label>
                      {isEditing ? (
                        <Textarea
                          value={currentData.bio}
                          onChange={(e) => handleInputChange('bio', e.target.value)}
                          className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          rows={4}
                          placeholder="Write a brief professional bio..."
                        />
                      ) : (
                        <p className="text-[#64748B] py-2">{currentData.bio}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* Clinic Information Tab */}
              <TabsContent value="clinic" className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-[#F59E0B]" />
                      Clinic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">Clinic Name</label>
                        {isEditing ? (
                          <Input
                            value={currentData.clinic_name}
                            onChange={(e) => handleInputChange('clinic_name', e.target.value)}
                            className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          />
                        ) : (
                          <p className="text-[#64748B] py-2">{currentData.clinic_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">Clinic Phone</label>
                        {isEditing ? (
                          <Input
                            value={currentData.clinic_phone}
                            onChange={(e) => handleInputChange('clinic_phone', e.target.value)}
                            className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          />
                        ) : (
                          <p className="text-[#64748B] py-2">{currentData.clinic_phone}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Clinic Address</label>
                      {isEditing ? (
                        <Textarea
                          value={currentData.clinic_address}
                          onChange={(e) => handleInputChange('clinic_address', e.target.value)}
                          className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          rows={3}
                        />
                      ) : (
                        <p className="text-[#64748B] py-2">{currentData.clinic_address}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Website</label>
                      {isEditing ? (
                        <Input
                          type="url"
                          value={currentData.website || ''}
                          onChange={(e) => handleInputChange('website', e.target.value)}
                          className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                          placeholder="https://your-clinic-website.com"
                        />
                      ) : (
                        <p className="text-[#64748B] py-2">{currentData.website || 'Not provided'}</p>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Consultation Fees</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-[#0F172A] mb-2">Consultation Fee</label>
                          {isEditing ? (
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]">₹</span>
                              <Input
                                type="number"
                                value={currentData.consultation_fee}
                                onChange={(e) => handleInputChange('consultation_fee', parseInt(e.target.value))}
                                className="pl-8 border-[#E2E8F0] focus:border-[#0EA5E9]"
                              />
                            </div>
                          ) : (
                            <p className="text-[#64748B] py-2">₹{currentData.consultation_fee}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#0F172A] mb-2">Follow-up Fee</label>
                          {isEditing ? (
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]">₹</span>
                              <Input
                                type="number"
                                value={currentData.follow_up_fee}
                                onChange={(e) => handleInputChange('follow_up_fee', parseInt(e.target.value))}
                                className="pl-8 border-[#E2E8F0] focus:border-[#0EA5E9]"
                              />
                            </div>
                          ) : (
                            <p className="text-[#64748B] py-2">₹{currentData.follow_up_fee}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#0F172A] mb-2">Emergency Fee</label>
                          {isEditing ? (
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]">₹</span>
                              <Input
                                type="number"
                                value={currentData.emergency_fee}
                                onChange={(e) => handleInputChange('emergency_fee', parseInt(e.target.value))}
                                className="pl-8 border-[#E2E8F0] focus:border-[#0EA5E9]"
                              />
                            </div>
                          ) : (
                            <p className="text-[#64748B] py-2">₹{currentData.emergency_fee}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Social Media</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[#0F172A] mb-2">LinkedIn</label>
                          {isEditing ? (
                            <Input
                              type="url"
                              value={currentData.social_media?.linkedin || ''}
                              onChange={(e) => handleInputChange('social_media', {
                                ...currentData.social_media,
                                linkedin: e.target.value
                              })}
                              className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                              placeholder="https://linkedin.com/in/your-profile"
                            />
                          ) : (
                            <p className="text-[#64748B] py-2">
                              {currentData.social_media?.linkedin || 'Not provided'}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#0F172A] mb-2">Twitter</label>
                          {isEditing ? (
                            <Input
                              type="url"
                              value={currentData.social_media?.twitter || ''}
                              onChange={(e) => handleInputChange('social_media', {
                                ...currentData.social_media,
                                twitter: e.target.value
                              })}
                              className="border-[#E2E8F0] focus:border-[#0EA5E9]"
                              placeholder="https://twitter.com/your-handle"
                            />
                          ) : (
                            <p className="text-[#64748B] py-2">
                              {currentData.social_media?.twitter || 'Not provided'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* Preferences Tab */}
              <TabsContent value="preferences" className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#8B5CF6]" />
                      Account Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Availability Status</label>
                      {isEditing ? (
                        <Select 
                          value={currentData.availability_status} 
                          onValueChange={(value) => handleInputChange('availability_status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select availability status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="busy">Busy</SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge 
                          className={`${
                            currentData.availability_status === 'available' ? 'bg-green-100 text-green-700' :
                            currentData.availability_status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          } border-0 capitalize`}
                        >
                          {currentData.availability_status}
                        </Badge>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Appointment Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-[#0F172A]">Auto-accept Appointments</p>
                            <p className="text-sm text-[#64748B]">Automatically accept new appointment requests</p>
                          </div>
                          {isEditing ? (
                            <Switch
                              checked={currentData.auto_accept_appointments}
                              onCheckedChange={(checked) => handleInputChange('auto_accept_appointments', checked)}
                            />
                          ) : (
                            <Badge variant={currentData.auto_accept_appointments ? 'default' : 'secondary'}>
                              {currentData.auto_accept_appointments ? 'Enabled' : 'Disabled'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Notification Preferences</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-[#0F172A]">Email Notifications</p>
                            <p className="text-sm text-[#64748B]">Receive notifications via email</p>
                          </div>
                          {isEditing ? (
                            <Switch
                              checked={currentData.email_notifications}
                              onCheckedChange={(checked) => handleInputChange('email_notifications', checked)}
                            />
                          ) : (
                            <Badge variant={currentData.email_notifications ? 'default' : 'secondary'}>
                              {currentData.email_notifications ? 'Enabled' : 'Disabled'}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-[#0F172A]">SMS Notifications</p>
                            <p className="text-sm text-[#64748B]">Receive notifications via SMS</p>
                          </div>
                          {isEditing ? (
                            <Switch
                              checked={currentData.sms_notifications}
                              onCheckedChange={(checked) => handleInputChange('sms_notifications', checked)}
                            />
                          ) : (
                            <Badge variant={currentData.sms_notifications ? 'default' : 'secondary'}>
                              {currentData.sms_notifications ? 'Enabled' : 'Disabled'}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-[#0F172A]">Push Notifications</p>
                            <p className="text-sm text-[#64748B]">Receive push notifications on your device</p>
                          </div>
                          {isEditing ? (
                            <Switch
                              checked={currentData.push_notifications}
                              onCheckedChange={(checked) => handleInputChange('push_notifications', checked)}
                            />
                          ) : (
                            <Badge variant={currentData.push_notifications ? 'default' : 'secondary'}>
                              {currentData.push_notifications ? 'Enabled' : 'Disabled'}
                            </Badge>
                          )}
                        </div>
                      </div>
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




