
import React, { memo, useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { PaymentSchedule } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Edit2, CircleDollarSign, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentScheduleTableProps {
  paymentSchedules: PaymentSchedule[];
  amount: number;
  isClientView: boolean;
  updatingPaymentId: string | null;
  onUpdateStatus: (paymentId: string, status: 'paid' | 'unpaid' | 'write-off') => void;
  formatCurrency: (amount: number) => string;
  onUpdatePaymentDate?: (paymentId: string, paymentDate: string) => void;
}

const PAYMENT_DESCRIPTION_OPTIONS = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'balance', label: 'Balance' },
  { value: 'full_payment', label: 'Full Payment' },
  { value: 'custom', label: 'Custom' }
];

const PaymentScheduleTable = memo(({
  paymentSchedules,
  amount,
  isClientView,
  updatingPaymentId,
  onUpdateStatus,
  formatCurrency,
  onUpdatePaymentDate
}: PaymentScheduleTableProps) => {
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

  // Calculate total percentage
  const totalPercentage = useMemo(() => {
    return paymentSchedules.reduce((sum, schedule) => sum + schedule.percentage, 0);
  }, [paymentSchedules]);

  // Check if the total percentage is valid
  const isPercentageValid = useMemo(() => {
    return Math.abs(totalPercentage - 100) < 0.01; // Allow for small floating point differences
  }, [totalPercentage]);

  // Calculate how far off 100% the total is
  const percentageDifference = useMemo(() => {
    return Math.abs(totalPercentage - 100).toFixed(2);
  }, [totalPercentage]);

  const handleDateSelect = (paymentId: string, date: Date | undefined) => {
    if (!date || !onUpdatePaymentDate) return;

    const formattedDate = format(date, 'yyyy-MM-dd');
    onUpdatePaymentDate(paymentId, formattedDate);
    
    // Format the date for display in the toast notification
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
    return (amount * schedule.percentage) / 100;
  };

  const renderDescriptionCell = (schedule: PaymentSchedule) => {
    const descType = selectedDescriptionTypes[schedule.id] || 
                    (PAYMENT_DESCRIPTION_OPTIONS.some(opt => opt.label === schedule.description) ? 
                      PAYMENT_DESCRIPTION_OPTIONS.find(opt => opt.label === schedule.description)?.value || 'custom' : 
                      'custom');
    
    if (editingDescriptionId === schedule.id) {
      return (
        <div className="flex flex-col space-y-2">
          <Select 
            value={descType} 
            onValueChange={(value) => {
              setSelectedDescriptionTypes(prev => ({
                ...prev,
                [schedule.id]: value
              }));
              
              if (value !== 'custom') {
                const label = PAYMENT_DESCRIPTION_OPTIONS.find(opt => opt.value === value)?.label || '';
                setCustomDescriptions(prev => ({
                  ...prev,
                  [schedule.id]: label
                }));
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_DESCRIPTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {descType === 'custom' && (
            <Input
              value={customDescriptions[schedule.id] || schedule.description}
              onChange={e => {
                setCustomDescriptions(prev => ({
                  ...prev,
                  [schedule.id]: e.target.value
                }));
              }}
              placeholder="Custom description"
            />
          )}
          
          <div className="flex justify-end">
            <Button 
              size="sm" 
              onClick={() => {
                setEditingDescriptionId(null);
              }}
            >
              Done
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between">
        <span>
          {descType === 'custom' ? 
            (customDescriptions[schedule.id] || schedule.description) : 
            PAYMENT_DESCRIPTION_OPTIONS.find(opt => opt.value === descType)?.label || schedule.description}
        </span>
        {!isClientView && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 ml-2"
            onClick={() => setEditingDescriptionId(schedule.id)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  const renderAmountCell = (schedule: PaymentSchedule) => {
    const paymentAmount = getPaymentAmount(schedule);
    
    if (editingAmountId === schedule.id) {
      return (
        <div className="flex flex-col space-y-2">
          <Input
            type="text"
            inputMode="decimal"
            value={customAmounts[schedule.id] || paymentAmount}
            onChange={e => {
              const value = e.target.value.replace(/[^\d.]/g, '');
              setCustomAmounts(prev => ({
                ...prev,
                [schedule.id]: value
              }));
            }}
            className="appearance-none"
          />
          
          <div className="flex justify-end">
            <Button 
              size="sm" 
              onClick={() => {
                setEditingAmountId(null);
              }}
            >
              Done
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-1">
        <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{formatCurrency(paymentAmount)}</span>
        {!isClientView && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 ml-2"
            onClick={() => setEditingAmountId(schedule.id)}
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
          {paymentSchedules.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell>
                {renderDescriptionCell(schedule)}
              </TableCell>
              <TableCell>
                {new Date(schedule.dueDate).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                {schedule.percentage.toFixed(2)}%
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
                        {!isClientView && (
                          <Popover open={editingDateId === schedule.id} onOpenChange={(open) => {
                            if (open) setEditingDateId(schedule.id);
                            else setEditingDateId(null);
                          }}>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => setEditingDateId(schedule.id)}
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
