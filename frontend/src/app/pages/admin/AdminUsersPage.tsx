import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  Users, Search, Filter, MoreVertical, Edit, Trash2, UserPlus,
  Shield, Clock, Calendar, Eye, Ban,
  CheckCircle, AlertTriangle, TrendingUp, Download, RefreshCw
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'patient' | 'doctor' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  phone?: string;
  profile_picture?: string;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  total_patients: number;
  total_doctors: number;
  total_admins: number;
  active_users: number;
  new_users_this_month: number;
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');

  // API call to get users
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', searchTerm, roleFilter, statusFilter, sortBy],
    queryFn: async (): Promise<UsersResponse> => {
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        sort_by: sortBy
      });
      
      const response = await fetch(`/api/v1/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    }
  });
  // Update user status mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update user status');
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
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
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete user');
    }
  });

  const handleUpdateStatus = (userId: string, status: string) => {
    updateUserStatusMutation.mutate({ userId, status });
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Shield;
      case 'doctor': return UserPlus;
      case 'patient': return Users;
      default: return Users;
    }
  };
  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="w-[300px] h-[40px]" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-[120px] rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-[80px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!usersData) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Unable to Load Users</h2>
          <p className="text-[#64748B] mb-6">There was an error loading the user data.</p>
          <Button onClick={() => refetch()} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { users, total, total_patients, total_doctors, total_admins, active_users, new_users_this_month } = usersData;
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
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2">User Management</h1>
            <p className="text-[#64748B]">Manage all users across your healthcare platform</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Total</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{total}</p>
                </div>
                <Users className="w-8 h-8 text-[#0EA5E9]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Patients</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{total_patients}</p>
                </div>
                <Users className="w-8 h-8 text-[#22C55E]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Doctors</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{total_doctors}</p>
                </div>
                <UserPlus className="w-8 h-8 text-[#3B82F6]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Admins</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{total_admins}</p>
                </div>
                <Shield className="w-8 h-8 text-[#EF4444]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Active</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{active_users}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-[#10B981]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">New</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{new_users_this_month}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#8B5CF6]" />
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B] w-4 h-4" />
                  <Input
                    placeholder="Search users by name, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="patient">Patients</SelectItem>
                  <SelectItem value="doctor">Doctors</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Recently Joined</SelectItem>
                  <SelectItem value="last_login">Last Login</SelectItem>
                  <SelectItem value="first_name">Name A-Z</SelectItem>
                  <SelectItem value="email">Email A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        {/* Users List */}
        {users.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No Users Found</h3>
              <p className="text-[#64748B] mb-6">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Try adjusting your filters to see more users.'
                  : 'No users have been registered yet.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-[#F8FAFC]">
                    <tr>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">User</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Role</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Status</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Last Login</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Joined</th>
                      <th className="text-right p-4 font-semibold text-[#0F172A]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => {
                      const RoleIcon = getRoleIcon(user.role);
                      return (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#22C55E] flex items-center justify-center text-white font-semibold">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-[#0F172A]">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-sm text-[#64748B]">{user.email}</p>
                                {!user.email_verified && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    Email not verified
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={`${getRoleColor(user.role)} border-0 flex items-center gap-1 w-fit`}>
                              <RoleIcon className="w-3 h-3" />
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge className={`${getStatusColor(user.status)} border-0`}>
                              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm text-[#64748B]">
                              <Clock className="w-3 h-3" />
                              {user.last_login 
                                ? new Date(user.last_login).toLocaleDateString()
                                : 'Never'
                              }
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm text-[#64748B]">
                              <Calendar className="w-3 h-3" />
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/admin/users/${user.id}`)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/admin/users/${user.id}`)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit User
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {user.status === 'active' ? (
                                    <DropdownMenuItem 
                                      onClick={() => handleUpdateStatus(user.id, 'suspended')}
                                    >
                                      <Ban className="w-4 h-4 mr-2" />
                                      Suspend User
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem 
                                      onClick={() => handleUpdateStatus(user.id, 'active')}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Activate User
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                                        <span className="text-red-500">Delete User</span>
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete {user.first_name} {user.last_name}? 
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDeleteUser(user.id)}
                                          className="bg-red-500 hover:bg-red-600"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}