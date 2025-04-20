import React, { memo, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { PaymentSchedule, PaymentStatus } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Edit2, CircleDollarSign, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentScheduleTableProps {
  paymentSchedules: PaymentSchedule[];
  amount: number;
  isClientView: boolean;
  isEditView?: boolean;
  updatingPaymentId: string | null;
  onUpdateStatus: (paymentId: string, status: PaymentStatus) => void;
  formatCurrency: (amount: number) => string;
  onUpdatePaymentDate?: (paymentId: string, paymentDate: string) => void;
  onUpdateAmount?: (paymentId: string, amount: number, percentage: number) => void;
  onUpdateDescription?: (paymentId: string, description: string) => void;
  onRemovePaymentSchedule?: (id: string) => void;
}

const PaymentScheduleTable = memo(({
  paymentSchedules,
  amount,
  isClientView,
  isEditView = true,
  updatingPaymentId,
  onUpdateStatus,
  formatCurrency,
  onUpdatePaymentDate,
  onUpdateAmount,
  onUpdateDescription,
  onRemovePaymentSchedule
}: PaymentScheduleTableProps) => {
  console.log('PaymentScheduleTable rendered with props:', { isClientView, isEditView });
  
  const paymentStatusColors: { [key: string]: string } = {
    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    unpaid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'write-off': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  };

  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [customDescriptions, setCustomDescriptions] = useState<{[key: string]: string}>({});
  const [selectedDescriptionTypes, setSelectedDescriptionTypes] = useState<{[key: string]: string}>({});
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<{[key: string]: string}>({});
  const [customPercentages, setCustomPercentages] = useState<{[key: string]: string}>({});
  const [editMode, setEditMode] = useState<'amount' | 'percentage'>('amount');

  const totalPercentage = useMemo(() => {
    return paymentSchedules.reduce((sum, schedule) => {
      return sum + (typeof schedule.percentage === 'number' ? schedule.percentage : 0);
    }, 0);
  }, [paymentSchedules]);

  const isPercentageValid = useMemo(() => {
    return Math.abs(totalPercentage - 100) < 0.01;
  }, [totalPercentage]);

  const percentageDifference = useMemo(() => {
    return Math.abs(totalPercentage - 100).toFixed(2);
  }, [totalPercentage]);

  const location = useLocation();
  const currentPath = location.pathname;
  const isCreateOrEditPath = currentPath.includes('/create') || currentPath.includes('/edit') || currentPath.includes('/new');
  
  const shouldEnableEditing = isEditView || isCreateOrEditPath;
  
  console.log('Current path:', currentPath, 'isEditView from props:', isEditView, 'shouldEnableEditing:', shouldEnableEditing);

  const handleDateSelect = (paymentId: string, date: Date | undefined) => {
    if (!date || !onUpdatePaymentDate) return;

    const formattedDate = format(date, 'yyyy-MM-dd');
    onUpdatePaymentDate(paymentId, formattedDate);
    
    const displayDate = format(date, 'dd-MMM-yyyy');
    toast.success(`Payment date updated to ${displayDate}`, {
      duration: 3000,
      position: 'top-center'
    });
    
    setEditingDateId(null);
  };

  const getPaymentAmount = (schedule: PaymentSchedule) => {
    if (schedule.amount !== undefined) {
      return schedule.amount;
    }
    return (amount * (schedule.percentage || 0)) / 100;
  };

  const handleAmountUpdate = (paymentId: string, schedule: PaymentSchedule) => {
    if (!onUpdateAmount) {
      console.log('onUpdateAmount handler is not provided');
      toast.error('Payment update is not available in this view', {
        duration: 3000,
        position: 'top-center'
      });
      setEditingAmountId(null);
      return;
    }
    
    try {
      const newAmountStr = customAmounts[paymentId] !== undefined 
        ? customAmounts[paymentId] 
        : schedule.amount?.toString() || '0';
      
      const newAmount = parseFloat(newAmountStr);
      if (isNaN(newAmount)) {
        console.log('Invalid amount value:', newAmountStr);
        toast.error('Please enter a valid amount');
        return;
      }
      
      const newPercentage = amount > 0 ? (newAmount / amount) * 100 : 0;
      
      console.log('Updating payment amount:', {
        paymentId,
        newAmount,
        newPercentage
      });
      
      onUpdateAmount(paymentId, newAmount, newPercentage);
      setEditingAmountId(null);
      setCustomAmounts({});
      
      toast.success('Payment amount updated', {
        duration: 3000,
        position: 'top-center'
      });
    } catch (error) {
      console.error('Error updating amount:', error);
      toast.error('Failed to update amount');
    }
  };

  const handlePercentageUpdate = (paymentId: string, schedule: PaymentSchedule) => {
    if (!onUpdateAmount) {
      console.log('onUpdateAmount handler is not provided');
      toast.error('Payment update is not available in this view', {
        duration: 3000,
        position: 'top-center'
      });
      setEditingAmountId(null);
      return;
    }
    
    try {
      const newPercentageStr = customPercentages[paymentId] !== undefined 
        ? customPercentages[paymentId] 
        : (schedule.percentage || 0).toFixed(2);
      
      const newPercentage = parseFloat(newPercentageStr);
      if (isNaN(newPercentage)) {
        console.log('Invalid percentage value:', newPercentageStr);
        toast.error('Please enter a valid percentage');
        return;
      }
      
      const newAmount = (amount * newPercentage) / 100;
      
      console.log('Updating payment percentage:', {
        paymentId,
        newAmount,
        newPercentage
      });
      
      onUpdateAmount(paymentId, newAmount, newPercentage);
      setEditingAmountId(null);
      setCustomPercentages({});
      
      toast.success('Payment percentage updated', {
        duration: 3000,
        position: 'top-center'
      });
    } catch (error) {
      console.error('Error updating percentage:', error);
      toast.error('Failed to update percentage');
    }
  };

  const handleDescriptionUpdate = (paymentId: string) => {
    if (!onUpdateDescription) {
      toast.error('Description update is not available in this view', {
        duration: 3000,
        position: 'top-center'
      });
      setEditingDescriptionId(null);
      return;
    }
    
    const descType = selectedDescriptionTypes[paymentId] || 'custom';
    let description = '';
    
    if (descType === 'custom') {
      description = customDescriptions[paymentId] || paymentSchedules.find(s => s.id === paymentId)?.description || '';
    } else {
      switch(descType) {
        case 'deposit':
          description = 'Deposit';
          break;
        case 'balance':
          description = 'Balance';
          break;
        case 'full_payment':
          description = 'Full Payment';
          break;
        default:
          description = '';
      }
    }
    
    if (description) {
      onUpdateDescription(paymentId, description);
      setEditingDescriptionId(null);
      toast.success('Payment description updated', {
        duration: 3000,
        position: 'top-center'
      });
    }
  };

  const renderDescriptionCell = (schedule: PaymentSchedule, index: number) => {
    const autoDescription = `${getOrdinalNumber(index + 1)} Payment`;
    
    if (!schedule.description || schedule.description === '') {
      if (onUpdateDescription) {
        onUpdateDescription(schedule.id, autoDescription);
      }
    }
    
    return (
      <div className="flex items-center justify-between">
        <span>{schedule.description || autoDescription}</span>
      </div>
    );
  };

  const getOrdinalNumber = (num: number): string => {
    const suffix = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
  };

  const renderAmountCell = (schedule: PaymentSchedule) => {
    const paymentAmount = getPaymentAmount(schedule);
    const percentage = schedule.percentage || 0;
    
    if (editingAmountId === schedule.id) {
      return (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2 mb-2">
            <Button
              size="sm"
              variant={editMode === 'amount' ? 'default' : 'outline'}
              onClick={() => setEditMode('amount')}
              className="text-xs h-6 px-2"
            >
              Amount
            </Button>
            <Button
              size="sm"
              variant={editMode === 'percentage' ? 'default' : 'outline'}
              onClick={() => setEditMode('percentage')}
              className="text-xs h-6 px-2"
            >
              Percentage
            </Button>
          </div>
          
          {editMode === 'amount' ? (
            <Input
              type="text"
              inputMode="decimal"
              value={customAmounts[schedule.id] !== undefined ? customAmounts[schedule.id] : paymentAmount}
              onChange={e => {
                const value = e.target.value.replace(/[^\d.]/g, '');
                setCustomAmounts(prev => ({
                  ...prev,
                  [schedule.id]: value
                }));
              }}
              className="appearance-none"
            />
          ) : (
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={customPercentages[schedule.id] !== undefined ? customPercentages[schedule.id] : percentage.toFixed(2)}
                onChange={e => {
                  const value = e.target.value.replace(/[^\d.]/g, '');
                  setCustomPercentages(prev => ({
                    ...prev,
                    [schedule.id]: value
                  }));
                }}
                className="appearance-none pr-6"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">%</span>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button 
              size="sm" 
              onClick={() => {
                console.log('Save button clicked, edit mode:', editMode);
                if (editMode === 'amount') {
                  handleAmountUpdate(schedule.id, schedule);
                } else {
                  handlePercentageUpdate(schedule.id, schedule);
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{formatCurrency(paymentAmount)}</span>
        </div>
        {!isClientView && shouldEnableEditing && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 ml-2"
            onClick={() => {
              console.log('Edit amount button clicked for schedule:', schedule.id, 'isEditView:', isEditView, 'shouldEnableEditing:', shouldEnableEditing);
              setEditingAmountId(schedule.id);
            }}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-md overflow-hidden">
      {!isPercentageValid && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            {totalPercentage > 100 
              ? `The total percentage exceeds 100% by ${percentageDifference}%. Please adjust the percentages.`
              : `The total percentage is ${percentageDifference}% below 100%. Please adjust the percentages to reach exactly 100%.`
            }
          </AlertDescription>
        </Alert>
      )}
      
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Description</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Percentage</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment Date</TableHead>
            {!isClientView && <TableHead className="w-24"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paymentSchedules.map((schedule, index) => (
            <TableRow key={schedule.id}>
              <TableCell>
                {renderDescriptionCell(schedule, index)}
              </TableCell>
              <TableCell>
                {schedule.dueDate && new Date(schedule.dueDate).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                {(schedule.percentage || 0).toFixed(2)}%
              </TableCell>
              <TableCell className="text-right font-medium">
                {renderAmountCell(schedule)}
              </TableCell>
              <TableCell>
                <Badge className={paymentStatusColors[schedule.status] || paymentStatusColors.unpaid}>
                  {schedule.status.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                {schedule.status === 'paid' ? (
                  <div className="flex items-center gap-2">
                    {schedule.paymentDate ? (
                      <>
                        <span>
                          {format(new Date(schedule.paymentDate), 'MMM d, yyyy')}
                        </span>
                        {!isClientView && shouldEnableEditing && (
                          <Popover open={editingDateId === schedule.id} onOpenChange={(open) => {
                            if (open) setEditingDateId(schedule.id);
                            else setEditingDateId(null);
                          }}>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => {
                                  console.log('Edit date button clicked');
                                  setEditingDateId(schedule.id);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={schedule.paymentDate ? new Date(schedule.paymentDate) : undefined}
                                onSelect={(date) => handleDateSelect(schedule.id, date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              {!isClientView && (
                <TableCell>
                  <div className="flex space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={updatingPaymentId === schedule.id}
                        >
                          {updatingPaymentId === schedule.id ? 'Updating...' : 'Set Status'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {schedule.status !== 'paid' && (
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(schedule.id, 'paid')}
                            className="text-green-600"
                          >
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                        {schedule.status !== 'unpaid' && (
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(schedule.id, 'unpaid')}
                          >
                            Mark as Unpaid
                          </DropdownMenuItem>
                        )}
                        {schedule.status !== 'write-off' && (
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(schedule.id, 'write-off')}
                            className="text-red-600"
                          >
                            Write Off
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {onRemovePaymentSchedule && shouldEnableEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemovePaymentSchedule(schedule.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <div className="p-4 border-t bg-gray-50">
        <div className="flex justify-between">
          <div>
            <Badge 
              variant={isPercentageValid ? "default" : "destructive"} 
              className={isPercentageValid 
                ? "bg-green-100 text-green-800" 
                : "bg-red-100 text-red-800 font-medium"
              }
            >
              Total: {totalPercentage.toFixed(2)}%
              {!isPercentageValid && (
                <span className="ml-1">
                  (Must be 100%)
                </span>
              )}
            </Badge>
          </div>
          <div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              Total Amount: {formatCurrency(amount)}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
});

PaymentScheduleTable.displayName = 'PaymentScheduleTable';

export default PaymentScheduleTable;
