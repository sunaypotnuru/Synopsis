import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, DollarSign, User, Calendar, CreditCard, CheckCircle,
  XCircle, Clock, Download, RefreshCw, AlertTriangle, FileText,
  TrendingUp, Eye, Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface PaymentDetail {
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
  razorpay_signature?: string;
  patient_name?: string;
  patient_email?: string;
  doctor_name?: string;
  doctor_email?: string;
  appointment_date?: string;
  created_at: string;
  updated_at: string;
  refund_id?: string;
  refund_amount?: number;
  refund_reason?: string;
  refund_date?: string;
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [refundReason, setRefundReason] = useState('');

  // Fetch payment details
  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment-detail', id],
    queryFn: async (): Promise<PaymentDetail> => {
      const response = await fetch(`/api/v1/admin/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment details');
      }
      
      return response.json();
    },
    enabled: !!id
  });

  // Process refund mutation
  const refundMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch(`/api/v1/admin/payments/${id}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      
      if (!response.ok) {
        throw new Error('Failed to process refund');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      toast.success('Refund processed successfully');
    },
    onError: () => {
      toast.error('Failed to process refund');
    }
  });

  const handleRefund = () => {
    if (!refundReason.trim()) {
      toast.error('Please provide a refund reason');
      return;
    }
    refundMutation.mutate(refundReason);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'refunded': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-[400px] rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-[300px] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Payment Not Found</h2>
          <p className="text-[#64748B] mb-6">The payment you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/admin/payments')} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Back to Payments
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
              onClick={() => navigate('/admin/payments')}
              className="hover:bg-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A] mb-2">
                Payment Details
              </h1>
              <p className="text-[#64748B]">Transaction ID: {payment.razorpay_payment_id || payment.id}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(payment.status)} border-0 text-sm px-4 py-2`}>
            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
          </Badge>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Payment Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Transaction Details */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#0EA5E9]" />
                  Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Amount</p>
                    <p className="text-2xl font-bold text-[#0F172A]">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Payment Method</p>
                    <p className="text-lg font-semibold text-[#0F172A]">
                      {payment.payment_method || 'Razorpay'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Payment ID</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-[#0F172A]">
                        {payment.razorpay_payment_id?.slice(0, 20) || 'N/A'}...
                      </p>
                      {payment.razorpay_payment_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(payment.razorpay_payment_id!)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Order ID</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-[#0F172A]">
                        {payment.razorpay_order_id?.slice(0, 20) || 'N/A'}...
                      </p>
                      {payment.razorpay_order_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(payment.razorpay_order_id!)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-[#64748B] mb-1">Transaction Date</p>
                  <p className="text-sm font-medium text-[#0F172A]">
                    {new Date(payment.created_at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Patient & Doctor Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0EA5E9]" />
                  Parties Involved
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-lg">
                    <p className="text-xs text-[#64748B] mb-2">PATIENT</p>
                    <p className="font-semibold text-[#0F172A] mb-1">
                      {payment.patient_name || 'Unknown Patient'}
                    </p>
                    <p className="text-sm text-[#64748B]">{payment.patient_email || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-[#F8FAFC] rounded-lg">
                    <p className="text-xs text-[#64748B] mb-2">DOCTOR</p>
                    <p className="font-semibold text-[#0F172A] mb-1">
                      {payment.doctor_name || 'Unknown Doctor'}
                    </p>
                    <p className="text-sm text-[#64748B]">{payment.doctor_email || 'N/A'}</p>
                  </div>
                </div>

                {payment.appointment_date && (
                  <div className="p-4 bg-[#F8FAFC] rounded-lg">
                    <p className="text-xs text-[#64748B] mb-2">APPOINTMENT</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#64748B]" />
                      <p className="text-sm font-medium text-[#0F172A]">
                        {new Date(payment.appointment_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Refund Information */}
            {payment.status === 'refunded' && (
              <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    Refund Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Refund Amount</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(payment.refund_amount || payment.amount, payment.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Refund Date</p>
                      <p className="text-sm font-medium text-[#0F172A]">
                        {payment.refund_date 
                          ? new Date(payment.refund_date).toLocaleString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>

                  {payment.refund_reason && (
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Refund Reason</p>
                      <p className="text-sm text-[#0F172A]">{payment.refund_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Eye className="w-4 h-4 mr-2" />
                  View Appointment
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  View Invoice
                </Button>
              </CardContent>
            </Card>

            {/* Refund Action */}
            {payment.status === 'success' && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-red-600">Process Refund</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-[#64748B]">
                    Process a refund for this transaction. This action cannot be undone.
                  </p>
                  <textarea
                    className="w-full p-3 border rounded-lg text-sm"
                    placeholder="Reason for refund..."
                    rows={3}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full border-red-500 text-red-500 hover:bg-red-50"
                        disabled={refundMutation.isPending}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Process Refund
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Process Refund</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to refund {formatCurrency(payment.amount, payment.currency)}? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleRefund}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Process Refund
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}

            {/* Payment Timeline */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">Payment Created</p>
                    <p className="text-xs text-[#64748B]">
                      {new Date(payment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {payment.status === 'success' && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">Payment Successful</p>
                      <p className="text-xs text-[#64748B]">
                        {new Date(payment.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {payment.status === 'refunded' && payment.refund_date && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">Refund Processed</p>
                      <p className="text-xs text-[#64748B]">
                        {new Date(payment.refund_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
