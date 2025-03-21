import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { MoreHorizontal, Download, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/context/CompanyContext';
import { toast } from '@/hooks/use-toast';
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
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format as formatDate } from 'date-fns';

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

type PeriodOption = 'all' | 'this-month' | 'last-month' | 'this-year' | 'custom';

type PaymentStats = {
  paid: number;
  unpaid: number;
  writeOff: number;
}

const Payments = () => {
  const navigate = useNavigate();
  const { selectedCompany } = useCompanyContext();
  const [payments, setPayments] = useState<PaymentScheduleWithDetails[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentScheduleWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalDue, setTotalDue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentScheduleWithDetails | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const isMountedRef = useRef(true);
  
  const [periodFilter, setPeriodFilter] = useState<PeriodOption>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    paid: 0,
    unpaid: 0,
    writeOff: 0
  });
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchPayments();
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (payments.length > 0) {
      filterPayments();
    }
  }, [payments, statusFilter, searchQuery, periodFilter, customStartDate, customEndDate]);

  const getDateRange = () => {
    const today = new Date();
    
    switch (periodFilter) {
      case 'this-month':
        return {
          start: startOfMonth(today),
          end: endOfMonth(today)
        };
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case 'this-year':
        return {
          start: startOfYear(today),
          end: endOfYear(today)
        };
      case 'all':
        return {
          start: undefined,
          end: undefined
        };
      case 'custom':
        return {
          start: customStartDate,
          end: customEndDate
        };
      default:
        return {
          start: undefined,
          end: undefined
        };
    }
  };

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
      
      const stats: PaymentStats = {
        paid: 0,
        unpaid: 0,
        writeOff: 0
      };
      
      transformedData.forEach(payment => {
        if (payment.status === 'paid') {
          stats.paid += payment.amount;
        } else if (payment.status === 'unpaid') {
          stats.unpaid += payment.amount;
        } else if (payment.status === 'write-off') {
          stats.writeOff += payment.amount;
        }
      });
      
      setPaymentStats(stats);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payments',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];
    
    const { start, end } = getDateRange();
    
    let dateFiltered = [...payments];
    if (start && end) {
      dateFiltered = dateFiltered.filter(payment => {
        const dueDate = parseISO(payment.dueDate);
        return dueDate >= start && dueDate <= end;
      });
      
      filtered = filtered.filter(payment => {
        const dueDate = parseISO(payment.dueDate);
        return dueDate >= start && dueDate <= end;
      });
    }
    
    const stats: PaymentStats = {
      paid: 0,
      unpaid: 0,
      writeOff: 0
    };
    
    dateFiltered.forEach(payment => {
      if (payment.status === 'paid') {
        stats.paid += payment.amount;
      } else if (payment.status === 'unpaid') {
        stats.unpaid += payment.amount;
      } else if (payment.status === 'write-off') {
        stats.writeOff += payment.amount;
      }
    });
    
    setPaymentStats(stats);
    
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
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
    
    const due = dateFiltered
      .filter(payment => payment.status === 'unpaid')
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    setTotalDue(due);
  };

  const handleStatusUpdate = async (payment: PaymentScheduleWithDetails, newStatus: 'paid' | 'unpaid' | 'write-off', event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (newStatus === 'paid') {
      setSelectedPayment(payment);
      setIsPaymentDialogOpen(true);
    } else {
      await updatePaymentStatus(payment.id, newStatus);
    }
  };

  const updatePaymentStatus = async (paymentId: string, status: string, paymentDate?: string) => {
    if (!isMountedRef.current || isUpdating) return;

    setIsUpdating(true);
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
      
      toast({
        title: 'Success',
        description: `Payment marked as ${status}`,
        variant: 'default'
      });
      
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
      
      setPaymentStats((prevStats) => {
        const newStats = { ...prevStats };
        if (status === 'paid') {
          newStats.paid += payment.amount;
        } else if (status === 'unpaid') {
          newStats.unpaid += payment.amount;
        } else if (status === 'write-off') {
          newStats.writeOff += payment.amount;
        }
        return newStats;
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment status',
        variant: 'destructive'
      });
    } finally {
      if (isMountedRef.current) {
        setIsUpdating(false);
      }
    }
  };

  const closePaymentDialog = () => {
    if (isUpdating) return;
    setIsPaymentDialogOpen(false);
    setTimeout(() => {
      if (isMountedRef.current) {
        setSelectedPayment(null);
        setPaymentDate(new Date());
      }
    }, 100);
  };

  const confirmPayment = async () => {
    if (!selectedPayment || !isMountedRef.current) return;
    
    const formattedDate = paymentDate ? formatDate(paymentDate, 'yyyy-MM-dd') : undefined;
    await updatePaymentStatus(selectedPayment.id, 'paid', formattedDate);
    closePaymentDialog();
  };

  const handleRowClick = (invoiceId: string, event: React.MouseEvent) => {
    if (!(event.target as HTMLElement).closest('.dropdown-actions')) {
      navigate(`/invoice/${invoiceId}`);
    }
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
    toast({
      title: 'Info',
      description: 'Export functionality will be implemented soon',
      variant: 'default'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Payments Overview</h1>
          <p className="text-gray-500">Dashboard &gt; Payments Overview</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 md:mt-0 w-full md:w-auto">
          <div className="rounded-lg p-3 bg-green-50 border border-green-100">
            <span className="text-xl font-bold text-green-600">{formatCurrency(paymentStats.paid)}</span>
            <p className="text-sm text-gray-500">Paid</p>
          </div>
          <div className="rounded-lg p-3 bg-amber-50 border border-amber-100">
            <span className="text-xl font-bold text-amber-600">{formatCurrency(paymentStats.unpaid)}</span>
            <p className="text-sm text-gray-500">Unpaid</p>
          </div>
          <div className="rounded-lg p-3 bg-gray-50 border border-gray-100">
            <span className="text-xl font-bold text-gray-600">{formatCurrency(paymentStats.writeOff)}</span>
            <p className="text-sm text-gray-500">Write-off</p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row flex-wrap gap-4 mb-6">
        <div className="w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="write-off">Write-off</SelectItem>
              <SelectItem value="all">All Payments</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full md:w-auto">
          <Select value={periodFilter} onValueChange={(value: PeriodOption) => {
            setPeriodFilter(value);
            setShowCustomDateRange(value === 'custom');
          }}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="this-month">This month</SelectItem>
              <SelectItem value="last-month">Last month</SelectItem>
              <SelectItem value="this-year">This year</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {showCustomDateRange && (
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  {customStartDate ? formatDate(customStartDate, "dd/MM/yyyy") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <DatePicker
                  mode="single"
                  selected={customStartDate}
                  onSelect={(date) => setCustomStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  {customEndDate ? formatDate(customEndDate, "dd/MM/yyyy") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <DatePicker
                  mode="single"
                  selected={customEndDate}
                  onSelect={(date) => setCustomEndDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
        
        <div className="relative w-full md:w-auto md:flex-1">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    No payments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow 
                    key={payment.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => handleRowClick(payment.invoiceId, e)}
                  >
                    <TableCell 
                      className="dropdown-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          {getStatusBadge(payment.status)}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {payment.status !== 'paid' && (
                            <DropdownMenuItem onClick={(e) => handleStatusUpdate(payment, 'paid', e)}>
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {payment.status !== 'unpaid' && (
                            <DropdownMenuItem onClick={(e) => handleStatusUpdate(payment, 'unpaid', e)}>
                              Mark as Unpaid
                            </DropdownMenuItem>
                          )}
                          {payment.status !== 'write-off' && (
                            <DropdownMenuItem onClick={(e) => handleStatusUpdate(payment, 'write-off', e)}>
                              Write Off
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>{formatDueDate(payment.dueDate, payment.status)}</TableCell>
                    <TableCell>{payment.invoiceNumber}</TableCell>
                    <TableCell>{payment.clientName}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{payment.jobTitle || 'N/A'}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        if (!open) closePaymentDialog();
        else setIsPaymentDialogOpen(true);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Payment Date</DialogTitle>
            <DialogDescription>
              Choose the date when this payment was received.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  disabled={isUpdating}
                >
                  {paymentDate ? formatDate(paymentDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <DatePicker
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => setPaymentDate(date as Date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePaymentDialog} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={confirmPayment} disabled={isUpdating}>
              {isUpdating ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
