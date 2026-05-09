import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  TrendingUp, Search, Filter, Calendar, User, DollarSign, CheckCircle,
  Clock, Download, RefreshCw, Eye, AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Refund {
  id: string;
  payment_id: string;
  patient_id: string;
  doctor_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processed' | 'failed';
  reason: string;
  patient_name?: string;
  doctor_name?: string;
  razorpay_refund_id?: string;
  created_at: string;
  processed_at?: string;
}

interface RefundsResponse {
  refunds: Refund[];
  total: number;
  total_amount: number;
  pending_refunds: number;
  processed_refunds: number;
  failed_refunds: number;
}

export default function RefundManagementPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');

  // API call to get refunds
  const { data: refundsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-refunds', searchTerm, statusFilter, sortBy],
    queryFn: async (): Promise<RefundsResponse> => {
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        sort_by: sortBy
      });
      
      const response = await fetch(`/api/v1/admin/refunds?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch refunds');
      }
      
      return response.json();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed': return CheckCircle;
      case 'pending': return Clock;
      case 'failed': return AlertTriangle;
      default: return Clock;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount / 100);
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

  if (!refundsData) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Unable to Load Refunds</h2>
          <p className="text-[#64748B] mb-6">There was an error loading the refund data.</p>
          <Button onClick={() => refetch()} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { 
    refunds, 
    total, 
    total_amount, 
    pending_refunds, 
    processed_refunds, 
    failed_refunds 
  } = refundsData;

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
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Refund Management</h1>
            <p className="text-[#64748B]">Monitor and process refund requests</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Total Refunded</p>
                  <p className="text-2xl font-bold text-[#0F172A]">
                    {formatCurrency(total_amount)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#3B82F6]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Processed</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{processed_refunds}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-[#22C55E]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Pending</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{pending_refunds}</p>
                </div>
                <Clock className="w-8 h-8 text-[#F59E0B]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Failed</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{failed_refunds}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-[#EF4444]" />
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
                    placeholder="Search by patient, doctor, or refund ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Recent First</SelectItem>
                  <SelectItem value="amount">Amount High-Low</SelectItem>
                  <SelectItem value="amount_asc">Amount Low-High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Refunds List */}
        {refunds.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <TrendingUp className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No Refunds Found</h3>
              <p className="text-[#64748B] mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters to see more refunds.'
                  : 'No refund requests have been processed yet.'
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
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Refund ID</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Patient</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Doctor</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Amount</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Reason</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Status</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Date</th>
                      <th className="text-right p-4 font-semibold text-[#0F172A]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((refund, index) => {
                      const StatusIcon = getStatusIcon(refund.status);
                      return (
                        <motion.tr
                          key={refund.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td className="p-4">
                            <p className="font-medium text-[#0F172A] font-mono text-sm">
                              {refund.razorpay_refund_id?.slice(0, 15) || refund.id.slice(0, 8)}...
                            </p>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-[#64748B]" />
                              <span className="text-sm text-[#0F172A]">
                                {refund.patient_name || 'Unknown Patient'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-[#64748B]" />
                              <span className="text-sm text-[#0F172A]">
                                {refund.doctor_name || 'Unknown Doctor'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-[#0F172A]">
                              {formatCurrency(refund.amount, refund.currency)}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-[#64748B] max-w-[200px] truncate">
                              {refund.reason}
                            </p>
                          </td>
                          <td className="p-4">
                            <Badge className={`${getStatusColor(refund.status)} border-0 flex items-center gap-1 w-fit`}>
                              <StatusIcon className="w-3 h-3" />
                              {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm text-[#64748B]">
                              <Calendar className="w-3 h-3" />
                              {new Date(refund.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/payments/${refund.payment_id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
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
