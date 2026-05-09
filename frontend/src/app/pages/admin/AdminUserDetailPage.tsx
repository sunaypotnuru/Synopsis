import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Save, Trash2, Ban, CheckCircle, Shield, Mail, Phone,
  MapPin, Calendar, Clock, Edit, User, Activity, FileText, AlertTriangle,
  Lock, Unlock, RefreshCw, Download, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface UserDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'patient' | 'doctor' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  date_of_birth?: string;
  profile_picture?: string;
  email_verified: boolean;
  phone_verified: boolean;
  two_factor_enabled: boolean;
  last_login?: string;
  login_count: number;
  created_at: string;
  updated_at: string;
  notes?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserDetail>>({});

  // Fetch user details
  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user-detail', id],
    queryFn: async (): Promise<UserDetail> => {
      const response = await fetch(`/api/v1/admin/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }
      
      return response.json();
    },
    enabled: !!id
  });

  // Fetch activity logs
  const { data: activityLogs } = useQuery({
    queryKey: ['admin-user-activity', id],
    queryFn: async (): Promise<ActivityLog[]> => {
      const response = await fetch(`/api/v1/admin/users/${id}/activity`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return [];
      }
      
      return response.json();
    },
    enabled: !!id
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: Partial<UserDetail>) => {
      const response = await fetch(`/api/v1/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated successfully');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Failed to update user');
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/v1/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] });
      toast.success('User status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update status');
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      navigate('/admin/users');
    },
    onError: () => {
      toast.error('Failed to delete user');
    }
  });

  const handleSave = () => {
    updateUserMutation.mutate(formData);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setFormData({
      first_name: user?.first_name,
      last_name: user?.last_name,
      email: user?.email,
      phone: user?.phone,
      role: user?.role,
      status: user?.status,
      address: user?.address,
      city: user?.city,
      state: user?.state,
      zip_code: user?.zip_code,
      country: user?.country,
      notes: user?.notes
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'doctor': return 'bg-blue-100 text-blue-700';
      case 'patient': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-yellow-100 text-yellow-700';
      case 'suspended': return 'bg-red-100 text-red-700';
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
              <Skeleton className="h-[400px] rounded-xl" />
              <Skeleton className="h-[300px] rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-[200px] rounded-xl" />
              <Skeleton className="h-[300px] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">User Not Found</h2>
          <p className="text-[#64748B] mb-6">The user you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate('/admin/users')} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Back to Users
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
              onClick={() => navigate('/admin/users')}
              className="hover:bg-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A] mb-2">
                {user.first_name} {user.last_name}
              </h1>
              <p className="text-[#64748B]">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {user.status === 'active' ? (
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate('suspended')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Suspend
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate('active')}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Activate
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {user.first_name} {user.last_name}? 
                        This action cannot be undone and will permanently remove all user data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteUserMutation.mutate()}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Delete User
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                  disabled={updateUserMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Profile Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0EA5E9]" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="personal" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>First Name</Label>
                        {isEditing ? (
                          <Input
                            value={formData.first_name || ''}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          />
                        ) : (
                          <p className="text-[#0F172A] font-medium mt-1">{user.first_name}</p>
                        )}
                      </div>
                      <div>
                        <Label>Last Name</Label>
                        {isEditing ? (
                          <Input
                            value={formData.last_name || ''}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          />
                        ) : (
                          <p className="text-[#0F172A] font-medium mt-1">{user.last_name}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Email</Label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[#0F172A] font-medium">{user.email}</p>
                          {user.email_verified ? (
                            <Badge className="bg-green-100 text-green-700 border-0">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 border-0">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Not Verified
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Role</Label>
                        {isEditing ? (
                          <Select
                            value={formData.role}
                            onValueChange={(value) => setFormData({ ...formData, role: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="patient">Patient</SelectItem>
                              <SelectItem value="doctor">Doctor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={`${getRoleColor(user.role)} border-0 mt-1`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <Label>Status</Label>
                        {isEditing ? (
                          <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={`${getStatusColor(user.status)} border-0 mt-1`}>
                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {user.date_of_birth && (
                      <div>
                        <Label>Date of Birth</Label>
                        <p className="text-[#0F172A] font-medium mt-1">
                          {new Date(user.date_of_birth).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-4 mt-6">
                    <div>
                      <Label>Phone</Label>
                      {isEditing ? (
                        <Input
                          value={formData.phone || ''}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[#0F172A] font-medium">{user.phone || 'Not provided'}</p>
                          {user.phone_verified && (
                            <Badge className="bg-green-100 text-green-700 border-0">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Address</Label>
                      {isEditing ? (
                        <Input
                          value={formData.address || ''}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      ) : (
                        <p className="text-[#0F172A] font-medium mt-1">{user.address || 'Not provided'}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>City</Label>
                        {isEditing ? (
                          <Input
                            value={formData.city || ''}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          />
                        ) : (
                          <p className="text-[#0F172A] font-medium mt-1">{user.city || 'Not provided'}</p>
                        )}
                      </div>
                      <div>
                        <Label>State</Label>
                        {isEditing ? (
                          <Input
                            value={formData.state || ''}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          />
                        ) : (
                          <p className="text-[#0F172A] font-medium mt-1">{user.state || 'Not provided'}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>ZIP Code</Label>
                        {isEditing ? (
                          <Input
                            value={formData.zip_code || ''}
                            onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                          />
                        ) : (
                          <p className="text-[#0F172A] font-medium mt-1">{user.zip_code || 'Not provided'}</p>
                        )}
                      </div>
                      <div>
                        <Label>Country</Label>
                        {isEditing ? (
                          <Input
                            value={formData.country || ''}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          />
                        ) : (
                          <p className="text-[#0F172A] font-medium mt-1">{user.country || 'Not provided'}</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="security" className="space-y-4 mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-[#64748B]" />
                          <div>
                            <p className="font-medium text-[#0F172A]">Email Verification</p>
                            <p className="text-sm text-[#64748B]">Email address verification status</p>
                          </div>
                        </div>
                        {user.email_verified ? (
                          <Badge className="bg-green-100 text-green-700 border-0">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700 border-0">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Not Verified
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-[#64748B]" />
                          <div>
                            <p className="font-medium text-[#0F172A]">Phone Verification</p>
                            <p className="text-sm text-[#64748B]">Phone number verification status</p>
                          </div>
                        </div>
                        {user.phone_verified ? (
                          <Badge className="bg-green-100 text-green-700 border-0">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700 border-0">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Not Verified
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-[#64748B]" />
                          <div>
                            <p className="font-medium text-[#0F172A]">Two-Factor Authentication</p>
                            <p className="text-sm text-[#64748B]">Additional security layer</p>
                          </div>
                        </div>
                        {user.two_factor_enabled ? (
                          <Badge className="bg-green-100 text-green-700 border-0">
                            <Lock className="w-3 h-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 border-0">
                            <Unlock className="w-3 h-3 mr-1" />
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#0EA5E9]" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activityLogs && activityLogs.length > 0 ? (
                  <div className="space-y-4">
                    {activityLogs.slice(0, 10).map((log, index) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-lg"
                      >
                        <div className="w-2 h-2 rounded-full bg-[#0EA5E9] mt-2" />
                        <div className="flex-1">
                          <p className="font-medium text-[#0F172A]">{log.action}</p>
                          <p className="text-sm text-[#64748B]">{log.description}</p>
                          {log.ip_address && (
                            <p className="text-xs text-[#94A3B8] mt-1">IP: {log.ip_address}</p>
                          )}
                        </div>
                        <p className="text-xs text-[#64748B]">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-[#64748B] mx-auto mb-3" />
                    <p className="text-[#64748B]">No activity logs available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Notes */}
            {isEditing && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#0EA5E9]" />
                    Admin Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full min-h-[120px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    placeholder="Add internal notes about this user..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Stats & Quick Info */}
          <div className="space-y-6">
            
            {/* Quick Stats */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#64748B]" />
                    <span className="text-sm text-[#64748B]">Last Login</span>
                  </div>
                  <span className="text-sm font-medium text-[#0F172A]">
                    {user.last_login 
                      ? new Date(user.last_login).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#64748B]" />
                    <span className="text-sm text-[#64748B]">Login Count</span>
                  </div>
                  <span className="text-sm font-medium text-[#0F172A]">
                    {user.login_count || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#64748B]" />
                    <span className="text-sm text-[#64748B]">Member Since</span>
                  </div>
                  <span className="text-sm font-medium text-[#0F172A]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#64748B]" />
                    <span className="text-sm text-[#64748B]">Last Updated</span>
                  </div>
                  <span className="text-sm font-medium text-[#0F172A]">
                    {new Date(user.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Account Status */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Role</span>
                  <Badge className={`${getRoleColor(user.role)} border-0`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Status</span>
                  <Badge className={`${getStatusColor(user.status)} border-0`}>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Email Verified</span>
                  {user.email_verified ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Phone Verified</span>
                  {user.phone_verified ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">2FA Enabled</span>
                  {user.two_factor_enabled ? (
                    <Lock className="w-5 h-5 text-green-500" />
                  ) : (
                    <Unlock className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Eye className="w-4 h-4 mr-2" />
                  View Full Profile
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="w-4 h-4 mr-2" />
                  View All Activity
                </Button>
              </CardContent>
            </Card>

            {/* Admin Notes Display */}
            {!isEditing && user.notes && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#0EA5E9]" />
                    Admin Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#64748B] whitespace-pre-wrap">{user.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
