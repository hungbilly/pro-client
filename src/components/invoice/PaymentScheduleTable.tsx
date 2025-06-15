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
import { CalendarIcon, Edit2, CircleDollarSign, AlertCircle, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import { useCompanyContext } from '@/context/CompanyContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PaymentScheduleTableProps {
  paymentSchedules: PaymentSchedule[];
  amount: number;
  isClientView: boolean;
  isEditView?: boolean;
  updatingPaymentId: string | null;
  onUpdateStatus: (paymentId: string, status: PaymentStatus, paymentDate?: string) => void;
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
  isEditView = false,
  updatingPaymentId,
  onUpdateStatus,
  formatCurrency: propFormatCurrency,
  onUpdatePaymentDate,
  onUpdateAmount,
  onUpdateDescription,
  onRemovePaymentSchedule
}: PaymentScheduleTableProps) => {
  const { selectedCompany } = useCompanyContext();
  const currency = selectedCompany?.currency || "USD";

  // Sort payment schedules by description order (1st, 2nd, 3rd, etc.) and then by due date
  const sortedPaymentSchedules = useMemo(() => {
    return [...paymentSchedules].sort((a, b) => {
      // Extract numbers from descriptions for proper ordering
      const getOrderNumber = (description: string) => {
        const match = description.match(/(\d+)(st|nd|rd|th)/i);
        return match ? parseInt(match[1]) : 999; // Put non-numbered items at the end
      };
      
      const orderA = getOrderNumber(a.description || '');
      const orderB = getOrderNumber(b.description || '');
      
      // If order numbers are different, sort by order number
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If order numbers are the same or both don't have numbers, sort by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      // If one has a due date and the other doesn't, prioritize the one with due date
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      
      return 0;
    });
  }, [paymentSchedules]);

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
  
  // Payment date dialog state
  const [isPaymentDateDialogOpen, setIsPaymentDateDialogOpen] = useState(false);
  const [selectedPaymentForDate, setSelectedPaymentForDate] = useState<PaymentSchedule | null>(null);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState<Date | undefined>(undefined);

  const totalPercentage = useMemo(() => {
    return sortedPaymentSchedules.reduce((sum, schedule) => {
      return sum + (typeof schedule.percentage === 'number' ? schedule.percentage : 0);
    }, 0);
  }, [sortedPaymentSchedules]);

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

  const handleStatusUpdate = (payment: PaymentSchedule, newStatus: PaymentStatus) => {
    if (newStatus === 'paid') {
      setSelectedPaymentForDate(payment);
      setSelectedPaymentDate(new Date()); // Set to today by default
      setIsPaymentDateDialogOpen(true);
    } else {
      onUpdateStatus(payment.id, newStatus);
    }
  };

  const handleConfirmPayment = () => {
    if (!selectedPaymentForDate || !selectedPaymentDate) return;
    
    const formattedDate = format(selectedPaymentDate, 'yyyy-MM-dd');
    onUpdateStatus(selectedPaymentForDate.id, 'paid', formattedDate);
    
    // Reset dialog state
    setIsPaymentDateDialogOpen(false);
    setSelectedPaymentForDate(null);
    setSelectedPaymentDate(undefined);
  };

  const handleCancelPaymentDialog = () => {
    setIsPaymentDateDialogOpen(false);
    setSelectedPaymentForDate(null);
    setSelectedPaymentDate(undefined);
  };

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
      description = customDescriptions[paymentId] || sortedPaymentSchedules.find(s => s.id === paymentId)?.description || '';
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
          <span>{trueFormatCurrency(paymentAmount)}</span>
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

  const trueFormatCurrency = (amt: number) => {
    return formatCurrency(amt, currency);
  };

  const ensureValidNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  return (
    <TooltipProvider>
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
              <TableHead className="w-[140px]">
                <div className="flex items-center gap-2">
                  Description
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Name or description for this payment installment</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="flex items-center gap-2">
                  Due Date
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>When this payment is expected to be received</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead className="text-right w-[72px]">
                <div className="flex items-center justify-end gap-2">
                  Percentage
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Percentage of total invoice amount for this payment</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead className="text-right w-[88px]">
                <div className="flex items-center justify-end gap-2">
                  Amount
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Dollar amount for this payment installment</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead className="w-[100px]">
                <div className="flex items-center gap-2">
                  Status
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Current payment status: Paid, Unpaid, or Write-off</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead className="w-[140px]">
                <div className="flex items-center gap-2">
                  Payment Date
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Actual date when payment was received (for paid items)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              {!isClientView && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPaymentSchedules.map((schedule, index) => (
              <TableRow key={schedule.id}>
                <TableCell className="w-[140px]">
                  {renderDescriptionCell(schedule, index)}
                </TableCell>
                <TableCell className="w-[120px]">
                  {schedule.dueDate && new Date(schedule.dueDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right w-[72px]">
                  {(schedule.percentage || 0).toFixed(2)}%
                </TableCell>
                <TableCell className="text-right font-medium w-[88px]">
                  {renderAmountCell(schedule)}
                </TableCell>
                <TableCell className="w-[100px]">
                  <Badge className={paymentStatusColors[schedule.status] || paymentStatusColors.unpaid}>
                    {schedule.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="w-[140px]">
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
                                  className="p-3 pointer-events-auto"
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
                              onClick={() => handleStatusUpdate(schedule, 'paid')}
                              className="text-green-600"
                            >
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {schedule.status !== 'unpaid' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(schedule, 'unpaid')}
                            >
                              Mark as Unpaid
                            </DropdownMenuItem>
                          )}
                          {schedule.status !== 'write-off' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(schedule, 'write-off')}
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
                Total Amount: {trueFormatCurrency(amount)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Date Selection Dialog - Fixed */}
      <Dialog open={isPaymentDateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCancelPaymentDialog();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Payment Date</DialogTitle>
            <DialogDescription>
              Choose the date when this payment was received.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Calendar
              mode="single"
              selected={selectedPaymentDate}
              onSelect={(date) => {
                console.log('Calendar date selected:', date);
                setSelectedPaymentDate(date);
              }}
              initialFocus
              className="p-3 pointer-events-auto rounded-md border"
            />
          </div>
          <div className="text-center text-sm text-muted-foreground mb-4">
            Selected date: {selectedPaymentDate ? format(selectedPaymentDate, 'MMMM d, yyyy') : 'None'}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelPaymentDialog}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmPayment}
              disabled={!selectedPaymentDate}
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
});

PaymentScheduleTable.displayName = 'PaymentScheduleTable';

export default PaymentScheduleTable;
