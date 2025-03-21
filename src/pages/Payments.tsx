
import React, { useState, useEffect, useCallback } from 'react';
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
  DialogClose,
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
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Used to track if a component is mounted to prevent state updates after unmounting
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    console.log('Component mounted');
    
    return () => {
      setIsMounted(false);
      console.log('Component unmounted');
    };
  }, []);

  useEffect(() => {
    if (isMounted) {
      fetchPayments();
    }
  }, [selectedCompany, isMounted]);

  useEffect(() => {
    if (payments.length > 0 && isMounted) {
      filterPayments();
    }
  }, [payments, statusFilter, searchQuery, isMounted]);

  const fetchPayments = async () => {
    if (!isMounted) {
      console.log('Skipping fetchPayments as component is unmounted');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Fetching payments data...');
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
        console.error('Error in fetchPayments query:', schedulesError);
        throw schedulesError;
      }

      if (!isMounted) {
        console.log('Component unmounted during fetch, aborting data processing');
        return;
      }

      console.log('Fetched payment schedules data:', schedulesData);
      
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

      if (!isMounted) {
        console.log('Component unmounted during transform, aborting state update');
        return;
      }

      console.log('Transformed payment data:', transformedData);
      setPayments(transformedData);
      
      const due = transformedData
        .filter(payment => payment.status === 'unpaid')
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      setTotalDue(due);
    } catch (error) {
      console.error('Error in fetchPayments:', error);
      if (isMounted) {
        toast.error('Failed to load payments');
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
        console.log('Finished loading payments');
      }
    }
  };

  const filterPayments = useCallback(() => {
    if (!isMounted) {
      console.log('Skipping filterPayments as component is unmounted');
      return;
    }
    
    console.log('Filtering payments with status:', statusFilter, 'and search:', searchQuery);
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
    
    console.log('Filtered payments count:', filtered.length);
    setFilteredPayments(filtered);
  }, [payments, statusFilter, searchQuery, isMounted]);

  const handleStatusUpdate = (payment: PaymentScheduleWithDetails, newStatus: 'paid' | 'unpaid' | 'write-off') => {
    if (!isMounted) {
      console.log('Skipping handleStatusUpdate as component is unmounted');
      return;
    }
    
    console.log('handleStatusUpdate triggered for payment:', payment.id, 'to status:', newStatus);
    
    if (newStatus === 'paid') {
      console.log('Opening payment date dialog');
      setSelectedPayment(payment);
      setPaymentDate(new Date());
      setIsPaymentDialogOpen(true);
    } else {
      console.log('Directly updating status to:', newStatus);
      updatePaymentStatus(payment.id, newStatus);
    }
  };

  const updatePaymentStatus = async (paymentId: string, status: string, paymentDate?: string) => {
    if (!isMounted) {
      console.log('Skipping updatePaymentStatus as component is unmounted');
      return;
    }
    
    console.log('updatePaymentStatus function called with:', { paymentId, status, paymentDate });
    
    if (isUpdating) {
      console.log('Update already in progress, ignoring this request');
      return;
    }
    
    setIsUpdating(true);
    console.log('isUpdating set to true');
    
    try {
      const updateData: any = { status };
      if (paymentDate) {
        updateData.payment_date = paymentDate;
      }
      
      console.log('Sending update to supabase with data:', updateData);
      
      const { error } = await supabase
        .from('payment_schedules')
        .update(updateData)
        .eq('id', paymentId);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      
      console.log('Supabase update successful');
      
      if (!isMounted) {
        console.log('Component unmounted during update, skipping state changes');
        return;
      }
      
      toast.success(`Payment marked as ${status}`);
      
      console.log('Updating local state with new status');
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
      console.log('Total due updated to:', due);
    } catch (error) {
      console.error('Error in updatePaymentStatus:', error);
      if (isMounted) {
        toast.error('Failed to update payment status');
      }
    } finally {
      console.log('Setting isUpdating back to false');
      if (isMounted) {
        setIsUpdating(false);
      }
    }
  };

  const confirmPayment = async () => {
    console.log('confirmPayment triggered with selectedPayment:', selectedPayment);
    
    if (!selectedPayment) {
      console.error('No payment selected, aborting confirmation');
      return;
    }
    
    console.log('Payment date selected:', paymentDate);
    const formattedDate = paymentDate ? format(paymentDate, 'yyyy-MM-dd') : undefined;
    console.log('Formatted payment date:', formattedDate);
    
    console.log('Calling updatePaymentStatus with status: paid');
    await updatePaymentStatus(selectedPayment.id, 'paid', formattedDate);
    
    console.log('Closing payment dialog after successful update');
    closePaymentDialog();
  };

  const closePaymentDialog = () => {
    console.log('closePaymentDialog triggered');
    if (isUpdating) {
      console.log('Update in progress, delaying dialog close');
      return;
    }
    
    setIsPaymentDialogOpen(false);
    // Delay clearing the selected payment to prevent UI flashes during transitions
    setTimeout(() => {
      if (isMounted) {
        setSelectedPayment(null);
        console.log('Dialog closed, selectedPayment cleared');
      }
    }, 300);
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
    console.log('Row clicked for payment:', payment.id);
    navigate(`/invoice/${payment.invoiceId}`);
  };

  const handleOpenChange = (open: boolean) => {
    console.log('Dialog onOpenChange triggered with open:', open);
    if (!open) {
      if (isUpdating) {
        console.log('Update in progress, preventing dialog from closing');
        return;
      }
      console.log('Dialog was closed by user, calling closePaymentDialog');
      closePaymentDialog();
    }
  };

  console.log('Rendering Payments component with dialog open:', isPaymentDialogOpen);
  console.log('isUpdating state:', isUpdating);

  // Create the payment action buttons with proper state controls
  const PaymentActionButtons = () => (
    <DialogFooter>
      <DialogClose asChild>
        <Button 
          variant="outline" 
          onClick={() => {
            console.log('Cancel button clicked');
            closePaymentDialog();
          }} 
          disabled={isUpdating}
        >
          Cancel
        </Button>
      </DialogClose>
      <Button 
        onClick={() => {
          console.log('Confirm Payment button clicked');
          confirmPayment();
        }} 
        disabled={isUpdating}
      >
        {isUpdating ? 'Processing...' : 'Confirm Payment'}
      </Button>
    </DialogFooter>
  );

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
                                console.log('Dropdown trigger clicked, preventing default');
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {payment.status !== 'paid' && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                console.log('Mark as Paid menu item clicked');
                                handleStatusUpdate(payment, 'paid');
                              }}>
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {payment.status !== 'unpaid' && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                console.log('Mark as Unpaid menu item clicked');
                                handleStatusUpdate(payment, 'unpaid');
                              }}>
                                Mark as Unpaid
                              </DropdownMenuItem>
                            )}
                            {payment.status !== 'write-off' && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                console.log('Write Off menu item clicked');
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
      
      <Dialog 
        open={isPaymentDialogOpen} 
        onOpenChange={handleOpenChange}
      >
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
              onSelect={(date) => {
                console.log('DatePicker date selected:', date);
                setPaymentDate(date as Date);
              }}
              placeholder="Select payment date"
            />
          </div>
          <PaymentActionButtons />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
