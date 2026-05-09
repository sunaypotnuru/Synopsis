import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Search, Filter, Download, Calendar, DollarSign, 
  CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Eye,
  ChevronDown, ChevronUp, RefreshCw, FileText, Wallet, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Transaction {
  id: string;
  date: string;
  patient_id: string;
  patient_name: string;
  patient_avatar?: string;
  appointment_id: string;
  type: 'consultation' | 'follow_up' | 'procedure' | 'emergency';
  service_name: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'upi' | 'insurance' | 'wallet';
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  transaction_id: string;
  notes?: string;
  refund_reason?: string;
  processing_fee?: number;
  net_amount: number;
}

interface TransactionSummary {
  total_transactions: number;
  total_amount: number;
  completed_amount: number;
  pending_amount: number;
  failed_amount: number;
  refunded_amount: number;
  avg_transaction: number;
}

export default function DoctorTransactionHistory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDateRange, setSelectedDateRange] = useState<{from: Date, to: Date} | undefined>();

  // Mock API call - replace with actual API
  const { data: transactionData, isLoading, refetch } = useQuery({
    queryKey: ['doctor-transactions', searchQuery, statusFilter, typeFilter, paymentMethodFilter, sortBy, sortOrder, selectedDateRange],
    queryFn: async () => {
      // Mock transaction data
      const transactions: Transaction[] = [
        {
          id: '1',
          date: '2024-05-07T10:30:00Z',
          patient_id: 'p1',
          patient_name: 'Priya Sharma',
          appointment_id: 'apt1',
          type: 'consultation',
          service_name: 'General Consultation',
          amount: 1500,
          payment_method: 'upi',
          status: 'completed',
          transaction_id: 'TXN001234567',
          processing_fee: 30,
          net_amount: 1470
        },
        {
          id: '2',
          date: '2024-05-07T14:15:00Z',
          patient_id: 'p2',
          patient_name: 'Rajesh Kumar',
          appointment_id: 'apt2',
          type: 'follow_up',
          service_name: 'Diabetes Follow-up',
          amount: 800,
          payment_method: 'cash',
          status: 'completed',
          transaction_id: 'TXN001234568',
          processing_fee: 0,
          net_amount: 800
        },
        {
          id: '3',
          date: '2024-05-06T16:45:00Z',
          patient_id: 'p3',
          patient_name: 'Anita Patel',
          appointment_id: 'apt3',
          type: 'procedure',
          service_name: 'Minor Surgery',
          amount: 5000,
          payment_method: 'card',
          status: 'pending',
          transaction_id: 'TXN001234569',
          processing_fee: 100,
          net_amount: 4900
        },
        {
          id: '4',
          date: '2024-05-06T11:20:00Z',
          patient_id: 'p4',
          patient_name: 'Suresh Gupta',
          appointment_id: 'apt4',
          type: 'consultation',
          service_name: 'Cardiology Consultation',
          amount: 2000,
          payment_method: 'insurance',
          status: 'completed',
          transaction_id: 'TXN001234570',
          processing_fee: 40,
          net_amount: 1960
        },
        {
          id: '5',
          date: '2024-05-05T09:30:00Z',
          patient_id: 'p5',
          patient_name: 'Meera Singh',
          appointment_id: 'apt5',
          type: 'emergency',
          service_name: 'Emergency Consultation',
          amount: 3000,
          payment_method: 'card',
          status: 'failed',
          transaction_id: 'TXN001234571',
          notes: 'Payment gateway error',
          processing_fee: 60,
          net_amount: 2940
        },
        {
          id: '6',
          date: '2024-05-04T15:00:00Z',
          patient_id: 'p6',
          patient_name: 'Vikram Joshi',
          appointment_id: 'apt6',
          type: 'consultation',
          service_name: 'General Consultation',
          amount: 1200,
          payment_method: 'upi',
          status: 'refunded',
          transaction_id: 'TXN001234572',
          refund_reason: 'Appointment cancelled by doctor',
          processing_fee: 24,
          net_amount: 1176
        }
      ];

      const summary: TransactionSummary = {
        total_transactions: transactions.length,
        total_amount: transactions.reduce((sum, t) => sum + t.amount, 0),
        completed_amount: transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0),
        pending_amount: transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0),
        failed_amount: transactions.filter(t => t.status === 'failed').reduce((sum, t) => sum + t.amount, 0),
        refunded_amount: transactions.filter(t => t.status === 'refunded').reduce((sum, t) => sum + t.amount, 0),
        avg_transaction: transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
      };

      return { transactions, summary };
    }
  });

  // Filter and sort transactions
  const filteredTransactions = transactionData?.transactions?.filter((transaction: Transaction) => {
    const matchesSearch = transaction.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.service_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    const matchesPaymentMethod = paymentMethodFilter === 'all' || transaction.payment_method === paymentMethodFilter;
    
    const matchesDateRange = !selectedDateRange || 
      (new Date(transaction.date) >= selectedDateRange.from && new Date(transaction.date) <= selectedDateRange.to);
    
    return matchesSearch && matchesStatus && matchesType && matchesPaymentMethod && matchesDateRange;
  }).sort((a: Transaction, b: Transaction) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        break;
      case 'amount':
        aValue = a.amount;
        bValue = b.amount;
        break;
      case 'patient':
        aValue = a.patient_name.toLowerCase();
        bValue = b.patient_name.toLowerCase();
        break;
      default:
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'refunded': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-700 border-red-200';
      case 'refunded': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'card': return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'upi': return <Wallet className="w-4 h-4 text-purple-600" />;
      case 'insurance': return <FileText className="w-4 h-4 text-orange-600" />;
      case 'wallet': return <Wallet className="w-4 h-4 text-pink-600" />;
      default: return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="w-[300px] h-[40px]" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-[120px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[600px] rounded-xl" />
        </div>
      </div>
    );
  }

  const summary = transactionData?.summary;

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
              onClick={() => navigate('/doctor/earnings')}
              className="p-2 hover:bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Transaction History</h1>
              <p className="text-[#64748B]">Detailed view of all your payment transactions</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="border-[#E2E8F0] hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Total Transactions</p>
                    <p className="text-2xl font-bold text-[#0F172A]">{summary?.total_transactions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Completed</p>
                    <p className="text-2xl font-bold text-green-600">₹{summary?.completed_amount?.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">₹{summary?.pending_amount?.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Avg Transaction</p>
                    <p className="text-2xl font-bold text-[#0F172A]">₹{summary?.avg_transaction?.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B] w-4 h-4" />
                  <Input
                    placeholder="Search by patient, transaction ID, or service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-[#E2E8F0] focus:border-[#0EA5E9]"
                  />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                {/* Type Filter */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>

                {/* Payment Method Filter */}
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                  const [field, order] = value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Latest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="amount-desc">Amount High</SelectItem>
                    <SelectItem value="amount-asc">Amount Low</SelectItem>
                    <SelectItem value="patient-asc">Patient A-Z</SelectItem>
                    <SelectItem value="patient-desc">Patient Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transactions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#0F172A]">
                Transactions ({filteredTransactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No Transactions Found</h3>
                  <p className="text-[#64748B]">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || paymentMethodFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'No transactions available'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {filteredTransactions.map((transaction: Transaction, index: number) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-6 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        
                        {/* Left Side - Patient & Service Info */}
                        <div className="flex items-center gap-4 flex-1">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={transaction.patient_avatar} />
                            <AvatarFallback className="bg-[#0EA5E9]/10 text-[#0EA5E9] font-bold">
                              {transaction.patient_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-[#0F172A]">{transaction.patient_name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {transaction.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-[#64748B] mb-1">{transaction.service_name}</p>
                            <div className="flex items-center gap-4 text-xs text-[#64748B]">
                              <span>{new Date(transaction.date).toLocaleDateString()}</span>
                              <span>{new Date(transaction.date).toLocaleTimeString()}</span>
                              <span>ID: {transaction.transaction_id}</span>
                            </div>
                          </div>
                        </div>

                        {/* Center - Payment Method */}
                        <div className="flex items-center gap-2 px-4">
                          {getPaymentMethodIcon(transaction.payment_method)}
                          <span className="text-sm font-medium text-[#0F172A] capitalize">
                            {transaction.payment_method}
                          </span>
                        </div>

                        {/* Right Side - Amount & Status */}
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${getStatusColor(transaction.status)} border`}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(transaction.status)}
                                <span className="capitalize">{transaction.status}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className="text-lg font-bold text-[#0F172A] mb-1">
                            ₹{transaction.amount.toLocaleString()}
                          </p>
                          {transaction.processing_fee && transaction.processing_fee > 0 && (
                            <p className="text-xs text-[#64748B]">
                              Net: ₹{transaction.net_amount.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Additional Info for Failed/Refunded */}
                      {(transaction.notes || transaction.refund_reason) && (
                        <>
                          <Separator className="my-4" />
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <span className="text-[#64748B]">
                              {transaction.notes || transaction.refund_reason}
                            </span>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}




