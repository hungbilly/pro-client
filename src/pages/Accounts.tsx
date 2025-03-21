
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { MoreHorizontal, Download, Search, PlusCircle, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Income tab - PaymentSchedule type
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

// Expense tab - Expense type
type Expense = {
  id: string;
  description: string;
  date: string;
  amount: number;
  category: string;
};

type PeriodOption = 'all' | 'this-month' | 'last-month' | 'this-year' | 'custom';

type AccountStats = {
  paid: number;
  unpaid: number;
  writeOff: number;
  expenses: number;
  profit: number;
}

const Accounts = () => {
  const navigate = useNavigate();
  const { selectedCompany } = useCompanyContext();
  const [activeTab, setActiveTab] = useState("income");
  
  // Income state
  const [payments, setPayments] = useState<PaymentScheduleWithDetails[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentScheduleWithDetails[]>([]);
  
  // Expense state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<{
    description: string;
    date: Date | undefined;
    amount: string;
    category: string;
  }>({
    description: '',
    date: new Date(),
    amount: '',
    category: 'general',
  });
  
  // Shared state
  const [isLoading, setIsLoading] = useState(true);
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
  const [accountStats, setAccountStats] = useState<AccountStats>({
    paid: 0,
    unpaid: 0,
    writeOff: 0,
    expenses: 0,
    profit: 0
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
      fetchExpenses();
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (payments.length > 0 || expenses.length > 0) {
      filterItems();
    }
  }, [payments, expenses, statusFilter, searchQuery, periodFilter, customStartDate, customEndDate, activeTab]);

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
  
  // Mock function for fetching expenses - in a real app this would connect to a database
  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      // This would be replaced with an actual database call
      // For now we'll use mock data
      const mockExpenses: Expense[] = [
        {
          id: '1',
          description: 'Camera Equipment',
          date: '2023-05-15',
          amount: 1200,
          category: 'equipment'
        },
        {
          id: '2',
          description: 'Studio Rent',
          date: '2023-05-01',
          amount: 800,
          category: 'rent'
        },
        {
          id: '3',
          description: 'Software Subscription',
          date: '2023-05-10',
          amount: 50,
          category: 'software'
        }
      ];
      
      setExpenses(mockExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load expenses',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterItems = () => {
    const { start, end } = getDateRange();
    
    // Filter payments
    let filteredPayments = [...payments];
    
    if (start && end) {
      filteredPayments = filteredPayments.filter(payment => {
        const dueDate = parseISO(payment.dueDate);
        return dueDate >= start && dueDate <= end;
      });
    }
    
    if (statusFilter && statusFilter !== 'all') {
      filteredPayments = filteredPayments.filter(payment => payment.status === statusFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredPayments = filteredPayments.filter(payment => 
        payment.clientName.toLowerCase().includes(query) ||
        payment.invoiceNumber.toLowerCase().includes(query) ||
        (payment.jobTitle && payment.jobTitle.toLowerCase().includes(query))
      );
    }
    
    setFilteredPayments(filteredPayments);
    
    // Filter expenses
    let filteredExpenses = [...expenses];
    
    if (start && end) {
      filteredExpenses = filteredExpenses.filter(expense => {
        const expenseDate = parseISO(expense.date);
        return expenseDate >= start && expenseDate <= end;
      });
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredExpenses = filteredExpenses.filter(expense => 
        expense.description.toLowerCase().includes(query) ||
        expense.category.toLowerCase().includes(query)
      );
    }
    
    setFilteredExpenses(filteredExpenses);
    
    // Calculate stats for the filtered data
    const dateFilteredPayments = start && end 
      ? payments.filter(payment => {
          const dueDate = parseISO(payment.dueDate);
          return dueDate >= start && dueDate <= end;
        })
      : payments;
    
    const dateFilteredExpenses = start && end
      ? expenses.filter(expense => {
          const expenseDate = parseISO(expense.date);
          return expenseDate >= start && expenseDate <= end;
        })
      : expenses;
    
    const paid = dateFilteredPayments
      .filter(payment => payment.status === 'paid')
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    const unpaid = dateFilteredPayments
      .filter(payment => payment.status === 'unpaid')
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    const writeOff = dateFilteredPayments
      .filter(payment => payment.status === 'write-off')
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    const expensesTotal = dateFilteredExpenses
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    const profit = paid - expensesTotal;
    
    setAccountStats({
      paid,
      unpaid,
      writeOff,
      expenses: expensesTotal,
      profit
    });
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
      
      // Fix: Use the found payment instead of undefined 'payment' variable
      const updatedPayment = updatedPayments.find(p => p.id === paymentId);
      
      if (updatedPayment) {
        setAccountStats((prevStats) => {
          const newStats = { ...prevStats };
          
          // First remove the old amount from whatever category it was in
          if (status === 'paid' && updatedPayment.status !== 'paid') {
            newStats.paid += updatedPayment.amount;
            if (updatedPayment.status === 'unpaid') newStats.unpaid -= updatedPayment.amount;
            if (updatedPayment.status === 'write-off') newStats.writeOff -= updatedPayment.amount;
          } else if (status === 'unpaid' && updatedPayment.status !== 'unpaid') {
            newStats.unpaid += updatedPayment.amount;
            if (updatedPayment.status === 'paid') newStats.paid -= updatedPayment.amount;
            if (updatedPayment.status === 'write-off') newStats.writeOff -= updatedPayment.amount;
          } else if (status === 'write-off' && updatedPayment.status !== 'write-off') {
            newStats.writeOff += updatedPayment.amount;
            if (updatedPayment.status === 'paid') newStats.paid -= updatedPayment.amount;
            if (updatedPayment.status === 'unpaid') newStats.unpaid -= updatedPayment.amount;
          }
          
          // Update profit
          newStats.profit = newStats.paid - newStats.expenses;
          
          return newStats;
        });
      }
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
  
  const addExpense = () => {
    if (!newExpense.description || !newExpense.date || !newExpense.amount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }
    
    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be a positive number',
        variant: 'destructive'
      });
      return;
    }
    
    // In a real app, this would save to the database
    const newExpenseItem: Expense = {
      id: Date.now().toString(), // temporary ID
      description: newExpense.description,
      date: formatDate(newExpense.date, 'yyyy-MM-dd'),
      amount: amount,
      category: newExpense.category
    };
    
    setExpenses([...expenses, newExpenseItem]);
    
    setAccountStats(prev => ({
      ...prev,
      expenses: prev.expenses + amount,
      profit: prev.paid - (prev.expenses + amount)
    }));
    
    toast({
      title: 'Success',
      description: 'Expense added successfully',
      variant: 'default'
    });
    
    // Reset form
    setNewExpense({
      description: '',
      date: new Date(),
      amount: '',
      category: 'general',
    });
    
    setIsExpenseDialogOpen(false);
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

  const exportData = () => {
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
          <h1 className="text-3xl font-bold">Account Management</h1>
          <p className="text-gray-500">Dashboard &gt; Account Management</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 md:mt-0 w-full md:w-auto">
          <div className="rounded-lg p-3 bg-green-50 border border-green-100">
            <span className="text-xl font-bold text-green-600">{formatCurrency(accountStats.paid)}</span>
            <p className="text-sm text-gray-500">Income</p>
          </div>
          <div className="rounded-lg p-3 bg-amber-50 border border-amber-100">
            <span className="text-xl font-bold text-amber-600">{formatCurrency(accountStats.unpaid)}</span>
            <p className="text-sm text-gray-500">Unpaid</p>
          </div>
          <div className="rounded-lg p-3 bg-gray-50 border border-gray-100">
            <span className="text-xl font-bold text-gray-600">{formatCurrency(accountStats.writeOff)}</span>
            <p className="text-sm text-gray-500">Write-off</p>
          </div>
          <div className="rounded-lg p-3 bg-red-50 border border-red-100">
            <span className="text-xl font-bold text-red-600">{formatCurrency(accountStats.expenses)}</span>
            <p className="text-sm text-gray-500">Expenses</p>
          </div>
          <div className="rounded-lg p-3 bg-blue-50 border border-blue-100">
            <span className="text-xl font-bold text-blue-600">{formatCurrency(accountStats.profit)}</span>
            <p className="text-sm text-gray-500">Profit</p>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="income" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="income" className="flex items-center">
            <TrendingUp className="mr-2 h-4 w-4" />
            Income
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center">
            <TrendingDown className="mr-2 h-4 w-4" />
            Expenses
          </TabsTrigger>
        </TabsList>
        
        <div className="flex flex-col md:flex-row flex-wrap gap-4 mb-6">
          {activeTab === "income" && (
            <div className="w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="write-off">Write-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
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
              placeholder={activeTab === "income" ? "Search by client, invoice, or job..." : "Search by description or category..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
          
          {activeTab === "income" ? (
            <Button 
              variant="outline" 
              onClick={exportData}
              className="whitespace-nowrap"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Payments
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsExpenseDialogOpen(true)}
                className="whitespace-nowrap"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
              <Button 
                variant="outline" 
                onClick={exportData}
                className="whitespace-nowrap"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Expenses
              </Button>
            </>
          )}
        </div>
        
        <TabsContent value="income" className="mt-0">
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
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="expenses" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10">
                        Loading expenses...
                      </TableCell>
                    </TableRow>
                  ) : filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{format(parseISO(expense.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          <Badge>
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Payment Dialog */}
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
      
      {/* Add Expense Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>
              Enter the details of your expense.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Input
                id="description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                placeholder="Enter expense description"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-10"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {newExpense.date ? formatDate(newExpense.date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <DatePicker
                    mode="single"
                    selected={newExpense.date}
                    onSelect={(date) => setNewExpense({...newExpense, date})}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">Category</label>
              <Select 
                value={newExpense.category} 
                onValueChange={(value) => setNewExpense({...newExpense, category: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addExpense}>
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounts;
