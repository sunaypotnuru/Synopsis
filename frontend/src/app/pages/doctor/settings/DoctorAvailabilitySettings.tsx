import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Clock, Calendar, Plus, Trash2, Save, Edit, 
  X, CheckCircle, AlertCircle, Copy, RotateCcw, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface DaySchedule {
  day: string;
  is_working_day: boolean;
  slots: TimeSlot[];
}

interface AvailabilitySettings {
  id: string;
  doctor_id: string;
  weekly_schedule: DaySchedule[];
  break_duration: number; // minutes
  slot_duration: number; // minutes
  advance_booking_days: number;
  same_day_booking: boolean;
  emergency_slots: boolean;
  buffer_time: number; // minutes between appointments
  auto_accept: boolean;
  timezone: string;
  special_dates: Array<{
    date: string;
    type: 'holiday' | 'special_hours' | 'unavailable';
    note?: string;
    custom_slots?: TimeSlot[];
  }>;
}
export default function DoctorAvailabilitySettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('schedule');
  const [isEditing, setIsEditing] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(null);

  // Mock API call - replace with actual API
  const { data: availability, isLoading } = useQuery({
    queryKey: ['doctor-availability-settings'],
    queryFn: async (): Promise<AvailabilitySettings> => {
      // Mock availability data
      return {
        id: 'avail1',
        doctor_id: 'doc1',
        weekly_schedule: [
          {
            day: 'Monday',
            is_working_day: true,
            slots: [
              { start_time: '09:00', end_time: '12:00', is_available: true },
              { start_time: '14:00', end_time: '17:00', is_available: true }
            ]
          },
          {
            day: 'Tuesday',
            is_working_day: true,
            slots: [
              { start_time: '09:00', end_time: '12:00', is_available: true },
              { start_time: '14:00', end_time: '17:00', is_available: true }
            ]
          },
          {
            day: 'Wednesday',
            is_working_day: true,
            slots: [
              { start_time: '09:00', end_time: '12:00', is_available: true },
              { start_time: '14:00', end_time: '17:00', is_available: true }
            ]
          },
          {
            day: 'Thursday',
            is_working_day: true,
            slots: [
              { start_time: '09:00', end_time: '12:00', is_available: true },
              { start_time: '14:00', end_time: '17:00', is_available: true }
            ]
          },
          {
            day: 'Friday',
            is_working_day: true,
            slots: [
              { start_time: '09:00', end_time: '12:00', is_available: true },
              { start_time: '14:00', end_time: '17:00', is_available: true }
            ]
          },
          {
            day: 'Saturday',
            is_working_day: true,
            slots: [
              { start_time: '09:00', end_time: '13:00', is_available: true }
            ]
          },
          {
            day: 'Sunday',
            is_working_day: false,
            slots: []
          }
        ],
        break_duration: 15,
        slot_duration: 30,
        advance_booking_days: 30,
        same_day_booking: true,
        emergency_slots: true,
        buffer_time: 5,
        auto_accept: true,
        timezone: 'Asia/Kolkata',
        special_dates: [
          {
            date: '2024-05-15',
            type: 'holiday',
            note: 'National Holiday'
          },
          {
            date: '2024-05-20',
            type: 'special_hours',
            note: 'Conference Day',
            custom_slots: [
              { start_time: '15:00', end_time: '18:00', is_available: true }
            ]
          }
        ]
      };
    }
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async (updatedAvailability: Partial<AvailabilitySettings>) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return updatedAvailability;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-availability-settings'] });
      setIsEditing(false);
      setEditingDay(null);
    }
  });

  const handleScheduleUpdate = (dayIndex: number, updatedSchedule: DaySchedule) => {
    if (!availability) return;
    
    const newWeeklySchedule = [...availability.weekly_schedule];
    newWeeklySchedule[dayIndex] = updatedSchedule;
    
    updateAvailabilityMutation.mutate({
      weekly_schedule: newWeeklySchedule
    });
  };

  const addTimeSlot = (dayIndex: number) => {
    if (!availability) return;
    
    const newSlot: TimeSlot = {
      start_time: '09:00',
      end_time: '10:00',
      is_available: true
    };
    
    const updatedSchedule = {
      ...availability.weekly_schedule[dayIndex],
      slots: [...availability.weekly_schedule[dayIndex].slots, newSlot]
    };
    
    handleScheduleUpdate(dayIndex, updatedSchedule);
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    if (!availability) return;
    
    const updatedSchedule = {
      ...availability.weekly_schedule[dayIndex],
      slots: availability.weekly_schedule[dayIndex].slots.filter((_, i) => i !== slotIndex)
    };
    
    handleScheduleUpdate(dayIndex, updatedSchedule);
  };

  const copySchedule = (fromDayIndex: number, toDayIndex: number) => {
    if (!availability) return;
    
    const sourceSchedule = availability.weekly_schedule[fromDayIndex];
    const updatedSchedule = {
      ...availability.weekly_schedule[toDayIndex],
      slots: [...sourceSchedule.slots],
      is_working_day: sourceSchedule.is_working_day
    };
    
    handleScheduleUpdate(toDayIndex, updatedSchedule);
  };
  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-6xl mx-auto space-y-8">
          <Skeleton className="w-[300px] h-[40px]" />
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <Skeleton key={i} className="h-[300px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!availability) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-6xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Availability Settings Not Found</h2>
          <p className="text-[#64748B] mb-6">Unable to load your availability settings.</p>
          <Button onClick={() => navigate('/doctor/settings')} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Back to Settings
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
              onClick={() => navigate('/doctor/settings')}
              className="p-2 hover:bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Availability Settings</h1>
              <p className="text-[#64748B]">Manage your working hours and appointment availability</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className={`border-[#E2E8F0] ${isEditing ? 'border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white' : 'hover:border-[#0EA5E9] hover:text-[#0EA5E9]'}`}
            >
              {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
              {isEditing ? 'Cancel' : 'Edit Schedule'}
            </Button>
            {isEditing && (
              <Button
                onClick={() => updateAvailabilityMutation.mutate({})}
                disabled={updateAvailabilityMutation.isPending}
                className="bg-[#22C55E] hover:bg-[#16A34A] text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateAvailabilityMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
            <TabsTrigger value="settings">Booking Settings</TabsTrigger>
            <TabsTrigger value="special">Special Dates</TabsTrigger>
          </TabsList>

          {/* Weekly Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            
            {/* Quick Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Settings className="w-5 h-5 text-[#0EA5E9]" />
                    Quick Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Slot Duration</label>
                      <Select 
                        value={availability.slot_duration.toString()} 
                        onValueChange={(value) => updateAvailabilityMutation.mutate({ slot_duration: parseInt(value) })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Break Duration</label>
                      <Select 
                        value={availability.break_duration.toString()} 
                        onValueChange={(value) => updateAvailabilityMutation.mutate({ break_duration: parseInt(value) })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Buffer Time</label>
                      <Select 
                        value={availability.buffer_time.toString()} 
                        onValueChange={(value) => updateAvailabilityMutation.mutate({ buffer_time: parseInt(value) })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No buffer</SelectItem>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Timezone</label>
                      <Select 
                        value={availability.timezone} 
                        onValueChange={(value) => updateAvailabilityMutation.mutate({ timezone: value })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                          <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                          <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Weekly Schedule Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-7 gap-4"
            >
              {availability.weekly_schedule.map((daySchedule, dayIndex) => (
                <Card key={daySchedule.day} className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-[#0F172A]">
                        {daySchedule.day}
                      </CardTitle>
                      {isEditing && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedSchedule = {
                                ...daySchedule,
                                is_working_day: !daySchedule.is_working_day,
                                slots: !daySchedule.is_working_day ? [{ start_time: '09:00', end_time: '17:00', is_available: true }] : []
                              };
                              handleScheduleUpdate(dayIndex, updatedSchedule);
                            }}
                            className="p-1 h-6 w-6"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                          {dayIndex > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copySchedule(dayIndex - 1, dayIndex)}
                              className="p-1 h-6 w-6"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Switch
                          checked={daySchedule.is_working_day}
                          onCheckedChange={(checked) => {
                            const updatedSchedule = {
                              ...daySchedule,
                              is_working_day: checked,
                              slots: checked ? (daySchedule.slots.length === 0 ? [{ start_time: '09:00', end_time: '17:00', is_available: true }] : daySchedule.slots) : []
                            };
                            handleScheduleUpdate(dayIndex, updatedSchedule);
                          }}
                        />
                      ) : (
                        <Badge variant={daySchedule.is_working_day ? 'default' : 'secondary'}>
                          {daySchedule.is_working_day ? 'Working' : 'Off'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {daySchedule.is_working_day ? (
                      <div className="space-y-2">
                        {daySchedule.slots.map((slot, slotIndex) => (
                          <div key={slotIndex} className="flex items-center gap-2 p-2 bg-[#F8FAFC] rounded-lg">
                            {isEditing ? (
                              <>
                                <Input
                                  type="time"
                                  value={slot.start_time}
                                  onChange={(e) => {
                                    const updatedSlots = [...daySchedule.slots];
                                    updatedSlots[slotIndex] = { ...slot, start_time: e.target.value };
                                    handleScheduleUpdate(dayIndex, { ...daySchedule, slots: updatedSlots });
                                  }}
                                  className="text-xs h-8"
                                />
                                <span className="text-xs text-[#64748B]">-</span>
                                <Input
                                  type="time"
                                  value={slot.end_time}
                                  onChange={(e) => {
                                    const updatedSlots = [...daySchedule.slots];
                                    updatedSlots[slotIndex] = { ...slot, end_time: e.target.value };
                                    handleScheduleUpdate(dayIndex, { ...daySchedule, slots: updatedSlots });
                                  }}
                                  className="text-xs h-8"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                                  className="p-1 h-6 w-6 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-medium text-[#0F172A]">
                                  {slot.start_time} - {slot.end_time}
                                </span>
                                <Badge variant={slot.is_available ? 'default' : 'secondary'} className="text-xs">
                                  {slot.is_available ? 'Available' : 'Blocked'}
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addTimeSlot(dayIndex)}
                            className="w-full text-xs border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E] hover:text-white"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Slot
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-xs text-[#64748B]">Day off</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </TabsContent>
          {/* Booking Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#22C55E]" />
                    Booking Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Advance Booking Days</label>
                      <Select 
                        value={availability.advance_booking_days.toString()} 
                        onValueChange={(value) => updateAvailabilityMutation.mutate({ advance_booking_days: parseInt(value) })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#64748B] mt-1">How far in advance patients can book</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#0F172A]">Booking Options</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Same Day Booking</p>
                        <p className="text-sm text-[#64748B]">Allow patients to book appointments for today</p>
                      </div>
                      {isEditing ? (
                        <Switch
                          checked={availability.same_day_booking}
                          onCheckedChange={(checked) => updateAvailabilityMutation.mutate({ same_day_booking: checked })}
                        />
                      ) : (
                        <Badge variant={availability.same_day_booking ? 'default' : 'secondary'}>
                          {availability.same_day_booking ? 'Enabled' : 'Disabled'}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Emergency Slots</p>
                        <p className="text-sm text-[#64748B]">Reserve slots for emergency appointments</p>
                      </div>
                      {isEditing ? (
                        <Switch
                          checked={availability.emergency_slots}
                          onCheckedChange={(checked) => updateAvailabilityMutation.mutate({ emergency_slots: checked })}
                        />
                      ) : (
                        <Badge variant={availability.emergency_slots ? 'default' : 'secondary'}>
                          {availability.emergency_slots ? 'Enabled' : 'Disabled'}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0F172A]">Auto Accept Appointments</p>
                        <p className="text-sm text-[#64748B]">Automatically confirm new appointment requests</p>
                      </div>
                      {isEditing ? (
                        <Switch
                          checked={availability.auto_accept}
                          onCheckedChange={(checked) => updateAvailabilityMutation.mutate({ auto_accept: checked })}
                        />
                      ) : (
                        <Badge variant={availability.auto_accept ? 'default' : 'secondary'}>
                          {availability.auto_accept ? 'Enabled' : 'Disabled'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Special Dates Tab */}
          <TabsContent value="special" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
                      Special Dates & Holidays
                    </CardTitle>
                    {isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E] hover:text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Special Date
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {availability.special_dates.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No Special Dates</h3>
                      <p className="text-[#64748B]">Add holidays or special working hours</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {availability.special_dates.map((specialDate, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              specialDate.type === 'holiday' ? 'bg-red-100' :
                              specialDate.type === 'special_hours' ? 'bg-blue-100' :
                              'bg-gray-100'
                            }`}>
                              <Calendar className={`w-5 h-5 ${
                                specialDate.type === 'holiday' ? 'text-red-600' :
                                specialDate.type === 'special_hours' ? 'text-blue-600' :
                                'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium text-[#0F172A]">
                                {new Date(specialDate.date).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-[#64748B]">{specialDate.note}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={
                                specialDate.type === 'holiday' ? 'bg-red-100 text-red-700' :
                                specialDate.type === 'special_hours' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }
                            >
                              {specialDate.type.replace('_', ' ')}
                            </Badge>
                            {isEditing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}




