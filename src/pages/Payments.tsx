import React, { useState, useEffect } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { MoreHorizontal, Download, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/context/CompanyContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';

type PaymentScheduleWithDetails = {
  id: string;
  description: string;
  dueDate: string;
  percentage: number;
  status: 'paid' | 'unpaid' | 'write-off';
  amount: number;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  jobTitle?: string;
  paymentDate?: string;
};

const Payments = () => {
  const { selectedCompany } = useCompanyContext();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentScheduleWithDetails[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentScheduleWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalDue, setTotalDue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('unpaid');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentScheduleWithDetails | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    fetchPayments();
  }, [selectedCompany]);

  useEffect(() => {
    if (payments.length > 0) {
      filterPayments();
    }
  }, [payments, statusFilter, searchQuery]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select(`
          *,
          invoices:invoice_id (
            id,
            number,
            amount,
            client_id,
            job_id,
            clients:client_id (name),
            jobs:job_id (title)
          )
        `)
        .order('due_date', { ascending: true });

      if (schedulesError) {
        throw schedulesError;
      }

      const transformedData: PaymentScheduleWithDetails[] = schedulesData.map((schedule) => {
        const invoice = schedule.invoices;
        const amount = invoice.amount * (schedule.percentage / 100);
        
        return {
          id: schedule.id,
          description: schedule.description || '',
          dueDate: schedule.due_date,
          percentage: schedule.percentage,
          status: (schedule.status || 'unpaid') as 'paid' | 'unpaid' | 'write-off',
          amount: amount,
          invoiceId: schedule.invoice_id,
          invoiceNumber: invoice.number,
          clientName: invoice.clients?.name || 'Unknown Client',
          jobTitle: invoice.jobs?.title,
          paymentDate: schedule.payment_date,
        };
      });

      setPayments(transformedData);
      
      const due = transformedData
        .filter(payment => payment.status === 'unpaid')
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      setTotalDue(due);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];
    
    if (statusFilter) {
      filtered = filtered.filter(payment => 
        statusFilter === 'all' ? true : payment.status === statusFilter
      );
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.clientName.toLowerCase().includes(query) ||
        payment.invoiceNumber.toLowerCase().includes(query) ||
        (payment.jobTitle && payment.jobTitle.toLowerCase().includes(query))
      );
    }
    
    setFilteredPayments(filtered);
  };

  const handleStatusUpdate = async (payment: PaymentScheduleWithDetails, newStatus: 'paid' | 'unpaid' | 'write-off') => {
    if (newStatus === 'paid') {
      setSelectedPayment(payment);
      setIsPaymentDialogOpen(true);
    } else {
      await updatePaymentStatus(payment.id, newStatus);
    }
  };

  const updatePaymentStatus = async (paymentId: string, status: string, paymentDate?: string) => {
    try {
      const updateData: any = { status };
      if (paymentDate) {
        updateData.payment_date = paymentDate;
      }
      
      const { error } = await supabase
        .from('payment_schedules')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;
      
      toast.success(`Payment marked as ${status}`);
      
      const updatedPayments = payments.map(payment => {
        if (payment.id === paymentId) {
          return { 
            ...payment, 
            status: status as 'paid' | 'unpaid' | 'write-off',
            paymentDate: paymentDate
          };
        }
        return payment;
      });
      
      setPayments(updatedPayments);
      
      const due = updatedPayments
        .filter(payment => payment.status === 'unpaid')
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      setTotalDue(due);
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  const confirmPayment = async () => {
    if (!selectedPayment) return;
    
    const formattedDate = paymentDate ? format(paymentDate, 'yyyy-MM-dd') : undefined;
    await updatePaymentStatus(selectedPayment.id, 'paid', formattedDate);
    setIsPaymentDialogOpen(false);
  };

  const formatDueDate = (dueDate: string, status: string) => {
    if (status !== 'unpaid') return format(parseISO(dueDate), 'dd MMM yyyy');
    
    const today = new Date();
    const due = parseISO(dueDate);
    const daysLeft = differenceInDays(due, today);
    
    let daysText = '';
    if (daysLeft < 0) {
      daysText = `(${Math.abs(daysLeft)} days overdue)`;
    } else if (daysLeft === 0) {
      daysText = '(today)';
    } else if (daysLeft === 1) {
      daysText = '(tomorrow)';
    } else {
      daysText = `(in ${daysLeft} days)`;
    }
    
    return `${format(due, 'dd MMM yyyy')} ${daysText}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'write-off':
        return <Badge className="bg-gray-500">Write-off</Badge>;
      default:
        return <Badge className="bg-amber-500">Unpaid</Badge>;
    }
  };

  const exportPayments = () => {
    toast.info('Export functionality will be implemented soon');
  };

  const handleRowClick = (payment: PaymentScheduleWithDetails) => {
    navigate(`/invoice/${payment.invoiceId}`);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Payments Overview</h1>
          <p className="text-gray-500">Dashboard &gt; Payments Overview</p>
        </div>
        <div className="flex flex-col items-end mt-4 md:mt-0">
          <span className="text-2xl font-bold text-emerald-500">${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-gray-500">Total Due</span>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between mb-6">
        <div className="w-full md:w-1/3 mb-4 md:mb-0">
          <select 
            className="w-full p-2 border rounded-md" 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="write-off">Write-off</option>
            <option value="all">All Payments</option>
          </select>
        </div>
        
        <div className="flex justify-between w-full md:w-2/3 gap-4">
          <div className="relative w-full">
            <Input
              placeholder="Search by client, invoice, or job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
          
          <Button 
            variant="outline" 
            onClick={exportPayments}
            className="whitespace-nowrap"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Payments
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Job</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    No payments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow 
                    key={payment.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      if (!e.defaultPrevented) {
                        handleRowClick(payment);
                      }
                    }}
                  >
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>{formatDueDate(payment.dueDate, payment.status)}</TableCell>
                    <TableCell>{payment.invoiceNumber}</TableCell>
                    <TableCell>{payment.clientName}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{payment.jobTitle || 'N/A'}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="dropdown-actions">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.preventDefault();
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {payment.status !== 'paid' && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(payment, 'paid');
                              }}>
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {payment.status !== 'unpaid' && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(payment, 'unpaid');
                              }}>
                                Mark as Unpaid
                              </DropdownMenuItem>
                            )}
                            {payment.status !== 'write-off' && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(payment, 'write-off');
                              }}>
                                Write Off
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Payment Date</DialogTitle>
            <DialogDescription>
              Choose the date when this payment was received.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <DatePicker 
              selected={paymentDate} 
              onSelect={setPaymentDate as (date: Date | null) => void}
              placeholder="Select payment date"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPayment}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
