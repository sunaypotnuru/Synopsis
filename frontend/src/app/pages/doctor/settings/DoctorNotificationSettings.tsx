import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Bell, Mail, MessageSquare, Smartphone, Calendar,
  Users, AlertTriangle, CheckCircle, Settings, Volume2, VolumeX,
  Clock, Shield, Zap, Save, RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NotificationSettings {
  id: string;
  doctor_id: string;
  
  // Email Notifications
  email_enabled: boolean;
  email_appointments: boolean;
  email_cancellations: boolean;
  email_reminders: boolean;
  email_messages: boolean;
  email_reviews: boolean;
  email_system_updates: boolean;
  email_marketing: boolean;
  
  // SMS Notifications
  sms_enabled: boolean;
  sms_appointments: boolean;
  sms_cancellations: boolean;
  sms_reminders: boolean;
  sms_emergency: boolean;
  
  // Push Notifications
  push_enabled: boolean;
  push_appointments: boolean;
  push_cancellations: boolean;
  push_messages: boolean;
  push_reminders: boolean;
  push_reviews: boolean;
  push_emergency: boolean;
  
  // Timing Settings
  reminder_timing: number; // hours before appointment
  quiet_hours_start: string;
  quiet_hours_end: string;
  weekend_notifications: boolean;
  
  // Frequency Settings
  digest_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  summary_frequency: 'daily' | 'weekly' | 'monthly';
  
  // Sound Settings
  notification_sound: boolean;
  sound_type: 'default' | 'gentle' | 'professional' | 'urgent';
}
export default function DoctorNotificationSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('channels');
  const [hasChanges, setHasChanges] = useState(false);

  // Mock API call - replace with actual API
  const { data: settings, isLoading } = useQuery({
    queryKey: ['doctor-notification-settings'],
    queryFn: async (): Promise<NotificationSettings> => {
      // Mock notification settings data
      return {
        id: 'notif1',
        doctor_id: 'doc1',
        
        // Email Notifications
        email_enabled: true,
        email_appointments: true,
        email_cancellations: true,
        email_reminders: true,
        email_messages: true,
        email_reviews: true,
        email_system_updates: true,
        email_marketing: false,
        
        // SMS Notifications
        sms_enabled: true,
        sms_appointments: true,
        sms_cancellations: true,
        sms_reminders: false,
        sms_emergency: true,
        
        // Push Notifications
        push_enabled: true,
        push_appointments: true,
        push_cancellations: true,
        push_messages: true,
        push_reminders: true,
        push_reviews: false,
        push_emergency: true,
        
        // Timing Settings
        reminder_timing: 24,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        weekend_notifications: false,
        
        // Frequency Settings
        digest_frequency: 'daily',
        summary_frequency: 'weekly',
        
        // Sound Settings
        notification_sound: true,
        sound_type: 'professional'
      };
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<NotificationSettings>) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return updatedSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-notification-settings'] });
      setHasChanges(false);
    }
  });

  const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
    setHasChanges(true);
    // In a real app, you'd update local state here
  };

  const handleSave = () => {
    updateSettingsMutation.mutate({});
  };

  const handleReset = () => {
    // Reset to original values
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-4xl mx-auto space-y-8">
          <Skeleton className="w-[300px] h-[40px]" />
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-[200px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Settings Not Found</h2>
          <p className="text-[#64748B] mb-6">Unable to load your notification settings.</p>
          <Button onClick={() => navigate('/doctor/settings')} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Back to Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
      <div className="max-w-4xl mx-auto space-y-8">
        
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
              <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Notification Settings</h1>
              <p className="text-[#64748B]">Manage how and when you receive notifications</p>
            </div>
          </div>
          <div className="flex gap-3">
            {hasChanges && (
              <>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="border-[#E2E8F0] hover:border-[#EF4444] hover:text-[#EF4444]"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateSettingsMutation.isPending}
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="types">Types</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Notification Channels Tab */}
          <TabsContent value="channels" className="space-y-6">
            
            {/* Email Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <Mail className="w-5 h-5 text-[#0EA5E9]" />
                      Email Notifications
                    </CardTitle>
                    <Switch
                      checked={settings.email_enabled}
                      onCheckedChange={(checked) => handleSettingChange('email_enabled', checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">New Appointments</p>
                        <p className="text-sm text-[#64748B]">When patients book appointments</p>
                      </div>
                      <Switch
                        checked={settings.email_appointments}
                        onCheckedChange={(checked) => handleSettingChange('email_appointments', checked)}
                        disabled={!settings.email_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Cancellations</p>
                        <p className="text-sm text-[#64748B]">When appointments are cancelled</p>
                      </div>
                      <Switch
                        checked={settings.email_cancellations}
                        onCheckedChange={(checked) => handleSettingChange('email_cancellations', checked)}
                        disabled={!settings.email_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Appointment Reminders</p>
                        <p className="text-sm text-[#64748B]">Upcoming appointment alerts</p>
                      </div>
                      <Switch
                        checked={settings.email_reminders}
                        onCheckedChange={(checked) => handleSettingChange('email_reminders', checked)}
                        disabled={!settings.email_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Patient Messages</p>
                        <p className="text-sm text-[#64748B]">New messages from patients</p>
                      </div>
                      <Switch
                        checked={settings.email_messages}
                        onCheckedChange={(checked) => handleSettingChange('email_messages', checked)}
                        disabled={!settings.email_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Reviews & Ratings</p>
                        <p className="text-sm text-[#64748B]">New patient reviews</p>
                      </div>
                      <Switch
                        checked={settings.email_reviews}
                        onCheckedChange={(checked) => handleSettingChange('email_reviews', checked)}
                        disabled={!settings.email_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">System Updates</p>
                        <p className="text-sm text-[#64748B]">Platform updates and announcements</p>
                      </div>
                      <Switch
                        checked={settings.email_system_updates}
                        onCheckedChange={(checked) => handleSettingChange('email_system_updates', checked)}
                        disabled={!settings.email_enabled}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* SMS Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[#22C55E]" />
                      SMS Notifications
                    </CardTitle>
                    <Switch
                      checked={settings.sms_enabled}
                      onCheckedChange={(checked) => handleSettingChange('sms_enabled', checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">New Appointments</p>
                        <p className="text-sm text-[#64748B]">Instant SMS alerts</p>
                      </div>
                      <Switch
                        checked={settings.sms_appointments}
                        onCheckedChange={(checked) => handleSettingChange('sms_appointments', checked)}
                        disabled={!settings.sms_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Cancellations</p>
                        <p className="text-sm text-[#64748B]">Immediate cancellation alerts</p>
                      </div>
                      <Switch
                        checked={settings.sms_cancellations}
                        onCheckedChange={(checked) => handleSettingChange('sms_cancellations', checked)}
                        disabled={!settings.sms_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Emergency Alerts</p>
                        <p className="text-sm text-[#64748B]">Critical notifications only</p>
                      </div>
                      <Switch
                        checked={settings.sms_emergency}
                        onCheckedChange={(checked) => handleSettingChange('sms_emergency', checked)}
                        disabled={!settings.sms_enabled}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Push Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-[#8B5CF6]" />
                      Push Notifications
                    </CardTitle>
                    <Switch
                      checked={settings.push_enabled}
                      onCheckedChange={(checked) => handleSettingChange('push_enabled', checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Appointments</p>
                        <p className="text-sm text-[#64748B]">New and updated appointments</p>
                      </div>
                      <Switch
                        checked={settings.push_appointments}
                        onCheckedChange={(checked) => handleSettingChange('push_appointments', checked)}
                        disabled={!settings.push_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Messages</p>
                        <p className="text-sm text-[#64748B]">Patient messages</p>
                      </div>
                      <Switch
                        checked={settings.push_messages}
                        onCheckedChange={(checked) => handleSettingChange('push_messages', checked)}
                        disabled={!settings.push_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Reminders</p>
                        <p className="text-sm text-[#64748B]">Upcoming appointments</p>
                      </div>
                      <Switch
                        checked={settings.push_reminders}
                        onCheckedChange={(checked) => handleSettingChange('push_reminders', checked)}
                        disabled={!settings.push_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Emergency</p>
                        <p className="text-sm text-[#64748B]">Critical alerts</p>
                      </div>
                      <Switch
                        checked={settings.push_emergency}
                        onCheckedChange={(checked) => handleSettingChange('push_emergency', checked)}
                        disabled={!settings.push_enabled}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
          {/* Notification Types Tab */}
          <TabsContent value="types" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#F59E0B]" />
                    Notification Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Appointments */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-[#0EA5E9]" />
                      <h3 className="text-lg font-semibold text-[#0F172A]">Appointments</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4 ml-8">
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg">
                        <Mail className="w-6 h-6 text-[#0EA5E9] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[#0F172A]">Email</p>
                        <Badge variant={settings.email_appointments ? 'default' : 'secondary'} className="mt-1">
                          {settings.email_appointments ? 'On' : 'Off'}
                        </Badge>
                      </div>
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg">
                        <MessageSquare className="w-6 h-6 text-[#22C55E] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[#0F172A]">SMS</p>
                        <Badge variant={settings.sms_appointments ? 'default' : 'secondary'} className="mt-1">
                          {settings.sms_appointments ? 'On' : 'Off'}
                        </Badge>
                      </div>
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg">
                        <Smartphone className="w-6 h-6 text-[#8B5CF6] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[#0F172A]">Push</p>
                        <Badge variant={settings.push_appointments ? 'default' : 'secondary'} className="mt-1">
                          {settings.push_appointments ? 'On' : 'Off'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Messages */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-[#22C55E]" />
                      <h3 className="text-lg font-semibold text-[#0F172A]">Patient Messages</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4 ml-8">
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg">
                        <Mail className="w-6 h-6 text-[#0EA5E9] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[#0F172A]">Email</p>
                        <Badge variant={settings.email_messages ? 'default' : 'secondary'} className="mt-1">
                          {settings.email_messages ? 'On' : 'Off'}
                        </Badge>
                      </div>
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg opacity-50">
                        <MessageSquare className="w-6 h-6 text-[#64748B] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[#64748B]">SMS</p>
                        <Badge variant="secondary" className="mt-1">N/A</Badge>
                      </div>
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg">
                        <Smartphone className="w-6 h-6 text-[#8B5CF6] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[#0F172A]">Push</p>
                        <Badge variant={settings.push_messages ? 'default' : 'secondary'} className="mt-1">
                          {settings.push_messages ? 'On' : 'Off'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Emergency */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                      <h3 className="text-lg font-semibold text-[#0F172A]">Emergency Alerts</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4 ml-8">
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg opacity-50">
                        <Mail className="w-6 h-6 text-[#64748B] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[#64748B]">Email</p>
                        <Badge variant="secondary" className="mt-1">N/A</Badge>
                      </div>
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg">
                        <MessageSquare className="w-6 h-6 text-[#22C55E] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[#0F172A]">SMS</p>
                        <Badge variant={settings.sms_emergency ? 'default' : 'secondary'} className="mt-1">
                          {settings.sms_emergency ? 'On' : 'Off'}
                        </Badge>
                      </div>
                      <div className="text-center p-4 bg-[#F8FAFC] rounded-lg">
                        <Smartphone className="w-6 h-6 text-[#8B5CF6] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[#0F172A]">Push</p>
                        <Badge variant={settings.push_emergency ? 'default' : 'secondary'} className="mt-1">
                          {settings.push_emergency ? 'On' : 'Off'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Timing Tab */}
          <TabsContent value="timing" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#8B5CF6]" />
                    Timing & Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Reminder Timing</label>
                      <Select 
                        value={settings.reminder_timing.toString()} 
                        onValueChange={(value) => handleSettingChange('reminder_timing', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 hour before</SelectItem>
                          <SelectItem value="2">2 hours before</SelectItem>
                          <SelectItem value="4">4 hours before</SelectItem>
                          <SelectItem value="24">24 hours before</SelectItem>
                          <SelectItem value="48">48 hours before</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#64748B] mt-1">When to send appointment reminders</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Digest Frequency</label>
                      <Select 
                        value={settings.digest_frequency} 
                        onValueChange={(value) => handleSettingChange('digest_frequency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#64748B] mt-1">How often to group notifications</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Quiet Hours</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">Start Time</label>
                        <input
                          type="time"
                          value={settings.quiet_hours_start}
                          onChange={(e) => handleSettingChange('quiet_hours_start', e.target.value)}
                          className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:border-[#0EA5E9] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">End Time</label>
                        <input
                          type="time"
                          value={settings.quiet_hours_end}
                          onChange={(e) => handleSettingChange('quiet_hours_end', e.target.value)}
                          className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:border-[#0EA5E9] focus:outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-[#64748B] mt-2">No notifications during these hours (except emergencies)</p>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#0F172A]">Weekend Notifications</p>
                      <p className="text-sm text-[#64748B]">Receive notifications on weekends</p>
                    </div>
                    <Switch
                      checked={settings.weekend_notifications}
                      onCheckedChange={(checked) => handleSettingChange('weekend_notifications', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Settings className="w-5 h-5 text-[#22C55E]" />
                    Sound & Display
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {settings.notification_sound ? (
                        <Volume2 className="w-5 h-5 text-[#22C55E]" />
                      ) : (
                        <VolumeX className="w-5 h-5 text-[#64748B]" />
                      )}
                      <div>
                        <p className="font-medium text-[#0F172A]">Notification Sounds</p>
                        <p className="text-sm text-[#64748B]">Play sound for notifications</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notification_sound}
                      onCheckedChange={(checked) => handleSettingChange('notification_sound', checked)}
                    />
                  </div>

                  {settings.notification_sound && (
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Sound Type</label>
                      <Select 
                        value={settings.sound_type} 
                        onValueChange={(value) => handleSettingChange('sound_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="gentle">Gentle</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Summary Reports</h3>
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Summary Frequency</label>
                      <Select 
                        value={settings.summary_frequency} 
                        onValueChange={(value) => handleSettingChange('summary_frequency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily Summary</SelectItem>
                          <SelectItem value="weekly">Weekly Summary</SelectItem>
                          <SelectItem value="monthly">Monthly Summary</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#64748B] mt-1">Receive periodic activity summaries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Test Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#F59E0B]" />
                    Test Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      variant="outline"
                      className="border-[#0EA5E9] text-[#0EA5E9] hover:bg-[#0EA5E9] hover:text-white"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Test Email
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E] hover:text-white"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Test SMS
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white"
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      Test Push
                    </Button>
                  </div>
                  <p className="text-sm text-[#64748B] mt-4">
                    Send test notifications to verify your settings are working correctly
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}




