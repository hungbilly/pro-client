import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { MoreHorizontal, Download, Search, PlusCircle, DollarSign, TrendingDown, TrendingUp, Plus, AlertCircle, Edit, Trash } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormMessage } from '@/components/ui/form';
import ExportDialog from '@/components/ExportDialog';
import { exportDataToFile, formatPaymentsForExport, formatExpensesForExport } from '@/utils/exportUtils';
import { formatCurrency } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
  companyId?: string;
};

type Expense = {
  id: string;
  description: string;
  date: string;
  amount: number;
  category: {
    id: string;
    name: string;
  };
  company_id?: string;
};

type ExpenseCategory = {
  id: string;
  name: string;
  company_id: string;
  created_at: string;
  updated_at: string;
};

type PeriodOption = 'all' | 'this-month' | 'last-month' | 'this-year' | 'custom';

type AccountStats = {
  paid: number;
  unpaid: number;
  writeOff: number;
  expenses: number;
  profit: number;
};

const Accounts = () => {
  const navigate = useNavigate();
  const { selectedCompany, selectedCompanyId } = useCompanyContext();
  const companyCurrency = selectedCompany?.currency || 'USD';
  const [activeTab, setActiveTab] = useState("income");
  
  const [payments, setPayments] = useState<PaymentScheduleWithDetails[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentScheduleWithDetails[]>([]);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newExpense, setNewExpense] = useState<{
    id?: string;
    description: string;
    date: Date | undefined;
    amount: string;
    categoryId: string;
  }>({
    description: '',
    date: new Date(),
    amount: '',
    categoryId: '',
  });
  const [isEditMode, setIsEditMode] = useState(false);
  
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
  
  const [expenseFormErrors, setExpenseFormErrors] = useState<{
    description?: string;
    date?: string;
    amount?: string;
  }>({});

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

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
      fetchExpenseCategories();
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
      console.log("Fetching payments for company ID:", selectedCompanyId);
      
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id')
        .eq('company_id', selectedCompanyId);
        
      if (invoicesError) {
        throw invoicesError;
      }
      
      if (!invoicesData || invoicesData.length === 0) {
        console.log("No invoices found for this company");
        setPayments([]);
        setIsLoading(false);
        return;
      }
      
      const invoiceIds = invoicesData.map(invoice => invoice.id);
      console.log("Found invoice IDs:", invoiceIds);
      
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
            company_id,
            clients:client_id (name),
            jobs:job_id (title)
          )
        `)
        .in('invoice_id', invoiceIds)
        .order('due_date', { ascending: true });

      if (schedulesError) {
        throw schedulesError;
      }

      console.log("Fetched payment schedules:", schedulesData?.length || 0);

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
          companyId: invoice.company_id,
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
  
  const fetchExpenseCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('name');

      if (error) {
        throw error;
      }

      setExpenseCategories(data || []);
      
      if (data?.length === 0) {
        const { data: defaultCategories, error: defaultError } = await supabase
          .from('expense_categories')
          .select('*')
          .is('company_id', null);
        
        if (defaultError) {
          throw defaultError;
        }
        
        const categoriesToInsert = defaultCategories.map(cat => ({
          name: cat.name,
          company_id: selectedCompanyId
        }));
        
        const { data: insertedData, error: insertError } = await supabase
          .from('expense_categories')
          .insert(categoriesToInsert)
          .select();
            
        if (insertError) {
          throw insertError;
        }
        
        setExpenseCategories(insertedData || []);
      } else {
        if (!data.some(cat => cat.name.toLowerCase() === 'uncategorized')) {
          const { data: uncategorizedData, error: uncategorizedError } = await supabase
            .from('expense_categories')
            .insert({ name: 'Uncategorized', company_id: selectedCompanyId })
            .select();
            
          if (uncategorizedError) {
            throw uncategorizedError;
          }
          
          setExpenseCategories([...data, ...(uncategorizedData || [])]);
        }
      }
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load expense categories',
        variant: 'destructive'
      });
    }
  };
  
  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          category:category_id (
            id,
            name
          )
        `)
        .eq('company_id', selectedCompanyId)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }
      
      const transformedExpenses: Expense[] = (data || []).map(expense => ({
        id: expense.id,
        description: expense.description,
        date: expense.date,
        amount: Number(expense.amount),
        category: {
          id: expense.category?.id || '',
          name: expense.category?.name || 'Uncategorized'
        },
        company_id: expense.company_id
      }));
      
      setExpenses(transformedExpenses);
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
        expense.category.name.toLowerCase().includes(query)
      );
    }
    
    setFilteredExpenses(filteredExpenses);
    
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
      
      const updatedPayment = updatedPayments.find(p => p.id === paymentId);
      
      if (updatedPayment) {
        setAccountStats((prevStats) => {
          const newStats = { ...prevStats };
          
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
  
  const getUncategorizedCategoryId = () => {
    const uncategorizedCategory = expenseCategories.find(cat => 
      cat.name.toLowerCase() === 'uncategorized');
    return uncategorizedCategory?.id || '';
  };
  
  const addExpense = async () => {
    setExpenseFormErrors({});
    
    const newErrors: {
      description?: string;
      date?: string;
      amount?: string;
    } = {};
    
    if (!newExpense.description.trim()) {
      newErrors.description = "Description is required";
    }
    
    if (!newExpense.date) {
      newErrors.date = "Date is required";
    }
    
    if (!newExpense.amount || newExpense.amount === '') {
      newErrors.amount = "Amount is required";
    } else {
      const amount = parseFloat(newExpense.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = "Amount must be a positive number";
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setExpenseFormErrors(newErrors);
      return;
    }
    
    const amount = parseFloat(newExpense.amount);
    
    const categoryId = newExpense.categoryId || getUncategorizedCategoryId();
    
    setIsUpdating(true);
    try {
      if (isEditMode && newExpense.id) {
        const { data, error } = await supabase
          .from('expenses')
          .update({
            description: newExpense.description,
            amount: amount,
            date: formatDate(newExpense.date, 'yyyy-MM-dd'),
            category_id: categoryId,
            company_id: selectedCompanyId
          })
          .eq('id', newExpense.id)
          .select(`
            *,
            category:category_id (
              id,
              name
            )
          `);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const updatedExpense: Expense = {
            id: data[0].id,
            description: data[0].description,
            date: data[0].date,
            amount: Number(data[0].amount),
            category: {
              id: data[0].category?.id || '',
              name: data[0].category?.name || 'Uncategorized'
            },
            company_id: data[0].company_id
          };
          
          setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
          
          toast({
            title: 'Success',
            description: 'Expense updated successfully',
            variant: 'default'
          });
        }
      } else {
        const { data, error } = await supabase
          .from('expenses')
          .insert({
            description: newExpense.description,
            amount: amount,
            date: formatDate(newExpense.date, 'yyyy-MM-dd'),
            category_id: categoryId,
            company_id: selectedCompanyId
          })
          .select(`
            *,
            category:category_id (
              id,
              name
            )
          `);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const newExpenseItem: Expense = {
            id: data[0].id,
            description: data[0].description,
            date: data[0].date,
            amount: Number(data[0].amount),
            category: {
              id: data[0].category?.id || '',
              name: data[0].category?.name || 'Uncategorized'
            },
            company_id: data[0].company_id
          };
          
          setExpenses(prev => [newExpenseItem, ...prev]);
          
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
        }
      }
      
      resetExpenseForm();
      setIsExpenseDialogOpen(false);
    } catch (error) {
      console.error('Error with expense:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isEditMode ? 'update' : 'add'} expense`,
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const editExpense = (expense: Expense) => {
    setIsEditMode(true);
    setNewExpense({
      id: expense.id,
      description: expense.description,
      date: parseISO(expense.date),
      amount: expense.amount.toString(),
      categoryId: expense.category.id,
    });
    setIsExpenseDialogOpen(true);
  };
  
  const deleteExpense = async (expense: Expense) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      setIsUpdating(true);
      try {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', expense.id);
        
        if (error) throw error;
        
        setExpenses(prev => prev.filter(exp => exp.id !== expense.id));
        
        setAccountStats(prev => ({
          ...prev,
          expenses: prev.expenses - expense.amount,
          profit: prev.paid - (prev.expenses - expense.amount)
        }));
        
        toast({
          title: 'Success',
          description: 'Expense deleted successfully',
          variant: 'default'
        });
      } catch (error) {
        console.error('Error deleting expense:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete expense',
          variant: 'destructive'
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };
  
  const resetExpenseForm = () => {
    setNewExpense({
      description: '',
      date: new Date(),
      amount: '',
      categoryId: '',
    });
    setIsEditMode(false);
    setExpenseFormErrors({});
  };
  
  const addExpenseCategory = async () => {
    if (!newCategory.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a category name',
        variant: 'destructive'
      });
      return;
    }
    
    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({
          name: newCategory.trim(),
          company_id: selectedCompanyId
        })
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setExpenseCategories(prev => [...prev, data[0]]);
        setNewCategory('');
        setIsCategoryDialogOpen(false);
        
        toast({
          title: 'Success',
          description: 'Category added successfully',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: 'Error',
        description: 'Failed to add category',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
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

  const handleExport = (format: 'csv' | 'xlsx') => {
    if (activeTab === 'income') {
      if (filteredPayments.length === 0) {
        toast({
          title: 'No data to export',
          description: 'There are no payments matching your current filters.',
          variant: 'destructive'
        });
        return;
      }
      
      const formattedData = formatPaymentsForExport(filteredPayments);
      exportDataToFile(formattedData, {
        filename: `payments-export-${formatDate(new Date(), 'yyyy-MM-dd')}`,
        format
      });
      
      toast({
        title: 'Export successful',
        description: `Payments have been exported to ${format.toUpperCase()} format.`,
        variant: 'default'
      });
    } else {
      if (filteredExpenses.length === 0) {
        toast({
          title: 'No data to export',
          description: 'There are no expenses matching your current filters.',
          variant: 'destructive'
        });
        return;
      }
      
      const formattedData = formatExpensesForExport(filteredExpenses);
      exportDataToFile(formattedData, {
        filename: `expenses-export-${formatDate(new Date(), 'yyyy-MM-dd')}`,
        format
      });
      
      toast({
        title: 'Export successful',
        description: `Expenses have been exported to ${format.toUpperCase()} format.`,
        variant: 'default'
      });
    }
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
            <span className="text-xl font-bold text-green-600">
              {formatCurrency(accountStats.paid, companyCurrency)}
            </span>
            <p className="text-sm text-gray-500">Income</p>
          </div>
          <div className="rounded-lg p-3 bg-amber-50 border border-amber-100">
            <span className="text-xl font-bold text-amber-600">
              {formatCurrency(accountStats.unpaid, companyCurrency)}
            </span>
            <p className="text-sm text-gray-500">Unpaid</p>
          </div>
          <div className="rounded-lg p-3 bg-gray-50 border border-gray-100">
            <span className="text-xl font-bold text-gray-600">
              {formatCurrency(accountStats.writeOff, companyCurrency)}
            </span>
            <p className="text-sm text-gray-500">Write-off</p>
          </div>
          <div className="rounded-lg p-3 bg-red-50 border border-red-100">
            <span className="text-xl font-bold text-red-600">
              {formatCurrency(accountStats.expenses, companyCurrency)}
            </span>
            <p className="text-sm text-gray-500">Expenses</p>
          </div>
          <div className="rounded-lg p-3 bg-blue-50 border border-blue-100">
            <span className="text-xl font-bold text-blue-600">
              {formatCurrency(accountStats.profit, companyCurrency)}
            </span>
            <p className="text-sm text-gray-500">Profit</p>
          </div>
        </div>
      </div>
      
      <ToggleGroup 
        type="single" 
        value={activeTab} 
        onValueChange={(value) => value && setActiveTab(value)}
        className="mb-6"
      >
        <ToggleGroupItem 
          value="income" 
          aria-label="Income"
          className={`flex items-center ${activeTab === 'income' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'hover:bg-gray-100'}`}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Income
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="expenses" 
          aria-label="Expenses"
          className={`flex items-center ${activeTab === 'expenses' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'hover:bg-gray-100'}`}
        >
          <TrendingDown className="mr-2 h-4 w-4" />
          Expenses
        </ToggleGroupItem>
      </ToggleGroup>
        
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
            onClick={() => setIsExportDialogOpen(true)}
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
              onClick={() => setIsCategoryDialogOpen(true)}
              className="whitespace-nowrap"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsExportDialogOpen(true)}
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
                        {formatCurrency(payment.amount, companyCurrency)}
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      Loading expenses...
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
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
                          {expense.category.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.amount, companyCurrency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editExpense(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteExpense(expense)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      
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
      
      <Dialog open={isExpenseDialogOpen} onOpenChange={(open) => {
        if (!open) {
          resetExpenseForm();
        }
        setIsExpenseDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Expense</DialogTitle>
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
                className={expenseFormErrors.description ? "border-red-500" : ""}
              />
              {expenseFormErrors.description && (
                <p className="text-sm font-medium text-red-500 mt-1">
                  {expenseFormErrors.description}
                </p>
              )}
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
                  className={`pl-10 ${expenseFormErrors.amount ? "border-red-500" : ""}`}
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              {expenseFormErrors.amount && (
                <p className="text-sm font-medium text-red-500 mt-1">
                  {expenseFormErrors.amount}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${expenseFormErrors.date ? "border-red-500" : ""}`}
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
              {expenseFormErrors.date && (
                <p className="text-sm font-medium text-red-500 mt-1">
                  {expenseFormErrors.date}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">Category (Optional)</label>
              <Select 
                value={newExpense.categoryId} 
                onValueChange={(value) => setNewExpense({...newExpense, categoryId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                If no category is selected, expense will be marked as "Uncategorized"
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsExpenseDialogOpen(false);
              resetExpenseForm();
            }}>
              Cancel
            </Button>
            <Button onClick={addExpense} disabled={isUpdating}>
              {isUpdating ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Expense' : 'Add Expense')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new expense category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="categoryName" className="text-sm font-medium">Category Name</label>
              <Input
                id="categoryName"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addExpenseCategory} disabled={isUpdating}>
              {isUpdating ? 'Adding...' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleExport}
        title={`Export ${activeTab === 'income' ? 'Payments' : 'Expenses'}`}
        description={`Choose a format to export your ${activeTab === 'income' ? 'payment' : 'expense'} data.`}
        count={activeTab === 'income' ? filteredPayments.length : filteredExpenses.length}
      />
    </div>
  );
};

export default Accounts;
