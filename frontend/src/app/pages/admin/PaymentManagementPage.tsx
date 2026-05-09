import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  DollarSign, Search, Filter, Calendar, User, CreditCard, CheckCircle,
  XCircle, Clock, TrendingUp, Download, RefreshCw, Eye, AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Payment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string;
  amount: number;
  currency: string;
  status: 'success' | 'pending' | 'failed' | 'refunded';
  payment_method: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  patient_name?: string;
  doctor_name?: string;
  created_at: string;
  updated_at: string;
}

interface PaymentsResponse {
  payments: Payment[];
  total: number;
  total_amount: number;
  successful_payments: number;
  pending_payments: number;
  failed_payments: number;
  refunded_payments: number;
}

export default function PaymentManagementPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');

  // API call to get payments
  const { data: paymentsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-payments', searchTerm, statusFilter, sortBy],
    queryFn: async (): Promise<PaymentsResponse> => {
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        sort_by: sortBy
      });
      
      const response = await fetch(`/api/v1/admin/payments?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }
      
      return response.json();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'refunded': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return CheckCircle;
      case 'pending': return Clock;
      case 'failed': return XCircle;
      case 'refunded': return TrendingUp;
      default: return Clock;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount / 100); // Assuming amount is in paise/cents
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

  if (!paymentsData) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Unable to Load Payments</h2>
          <p className="text-[#64748B] mb-6">There was an error loading the payment data.</p>
          <Button onClick={() => refetch()} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { 
    payments, 
    total, 
    total_amount, 
    successful_payments, 
    pending_payments, 
    failed_payments,
    refunded_payments 
  } = paymentsData;

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
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Payment Management</h1>
            <p className="text-[#64748B]">Monitor and manage all payment transactions</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-[#0F172A]">
                    {formatCurrency(total_amount)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-[#0EA5E9]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Successful</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{successful_payments}</p>
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
                  <p className="text-2xl font-bold text-[#0F172A]">{pending_payments}</p>
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
                  <p className="text-2xl font-bold text-[#0F172A]">{failed_payments}</p>
                </div>
                <XCircle className="w-8 h-8 text-[#EF4444]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Refunded</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{refunded_payments}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#3B82F6]" />
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
                    placeholder="Search by patient, doctor, or transaction ID..."
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
                  <SelectItem value="success">Successful</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
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

        {/* Payments List */}
        {payments.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <CreditCard className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No Payments Found</h3>
              <p className="text-[#64748B] mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters to see more payments.'
                  : 'No payment transactions have been recorded yet.'
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
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Transaction ID</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Patient</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Doctor</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Amount</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Status</th>
                      <th className="text-left p-4 font-semibold text-[#0F172A]">Date</th>
                      <th className="text-right p-4 font-semibold text-[#0F172A]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, index) => {
                      const StatusIcon = getStatusIcon(payment.status);
                      return (
                        <motion.tr
                          key={payment.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-[#0F172A] font-mono text-sm">
                                {payment.razorpay_payment_id?.slice(0, 20) || payment.id.slice(0, 8)}...
                              </p>
                              <p className="text-xs text-[#64748B]">
                                Order: {payment.razorpay_order_id?.slice(0, 15) || 'N/A'}...
                              </p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-[#64748B]" />
                              <span className="text-sm text-[#0F172A]">
                                {payment.patient_name || 'Unknown Patient'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-[#64748B]" />
                              <span className="text-sm text-[#0F172A]">
                                {payment.doctor_name || 'Unknown Doctor'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-[#0F172A]">
                              {formatCurrency(payment.amount, payment.currency)}
                            </p>
                          </td>
                          <td className="p-4">
                            <Badge className={`${getStatusColor(payment.status)} border-0 flex items-center gap-1 w-fit`}>
                              <StatusIcon className="w-3 h-3" />
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm text-[#64748B]">
                              <Calendar className="w-3 h-3" />
                              {new Date(payment.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/payments/${payment.id}`)}
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
