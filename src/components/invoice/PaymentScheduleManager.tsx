import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Trash2, Plus, Calendar, Percent, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentSchedule, PaymentStatus } from '@/types';
import { toast } from 'sonner';

interface PaymentScheduleManagerProps {
  paymentSchedules: PaymentSchedule[];
  invoiceAmount: number;
  onUpdateSchedules: (schedules: PaymentSchedule[]) => void;
}

const PaymentScheduleManager: React.FC<PaymentScheduleManagerProps> = ({
  paymentSchedules,
  invoiceAmount,
  onUpdateSchedules
}) => {
  const [newSchedule, setNewSchedule] = useState<Partial<PaymentSchedule>>({
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    percentage: 0,
    amount: 0,
    status: 'unpaid'
  });

  // Initialize with default payment schedule if none exist
  useEffect(() => {
    if (paymentSchedules.length === 0) {
      const defaultSchedule: PaymentSchedule = {
        id: generateId(),
        description: '1st payment',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        percentage: 100,
        status: 'unpaid',
        amount: invoiceAmount
      };
      onUpdateSchedules([defaultSchedule]);
    }
  }, [paymentSchedules.length, invoiceAmount, onUpdateSchedules]);

  // Update existing payment schedules when invoice amount changes
  useEffect(() => {
    if (paymentSchedules.length > 0 && invoiceAmount > 0) {
      const updatedSchedules = paymentSchedules.map(schedule => ({
        ...schedule,
        amount: (invoiceAmount * (schedule.percentage || 0)) / 100
      }));
      
      // Only update if amounts actually changed
      const hasAmountChanges = updatedSchedules.some((schedule, index) => 
        Math.abs((schedule.amount || 0) - (paymentSchedules[index].amount || 0)) > 0.01
      );
      
      if (hasAmountChanges) {
        onUpdateSchedules(updatedSchedules);
      }
    }
  }, [invoiceAmount]);

  const generateId = () => `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getOrdinalNumber = (num: number): string => {
    const suffix = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
  };

  const getNextPaymentDescription = () => {
    const count = paymentSchedules.length + 1;
    return `${getOrdinalNumber(count)} payment`;
  };

  const addPaymentSchedule = () => {
    if (!newSchedule.dueDate || (!newSchedule.percentage && !newSchedule.amount)) {
      toast.error('Please fill in all fields');
      return;
    }

    // Calculate percentage from amount or vice versa
    let percentage = newSchedule.percentage || 0;
    let amount = newSchedule.amount || 0;

    if (amount > 0 && invoiceAmount > 0) {
      percentage = (amount / invoiceAmount) * 100;
    } else if (percentage > 0) {
      amount = (invoiceAmount * percentage) / 100;
    }

    if (percentage <= 0 || percentage > 100) {
      toast.error('Percentage must be between 1 and 100');
      return;
    }

    const totalCurrentPercentage = paymentSchedules.reduce((sum, schedule) => sum + (schedule.percentage || 0), 0);
    
    // Auto-generate description
    const description = getNextPaymentDescription();
    
    // If adding this would exceed 100%, adjust the previous payment schedule
    if (totalCurrentPercentage + percentage > 100) {
      const excessPercentage = (totalCurrentPercentage + percentage) - 100;
      
      // Find the last payment schedule to deduct from
      const updatedSchedules = [...paymentSchedules];
      if (updatedSchedules.length > 0) {
        const lastScheduleIndex = updatedSchedules.length - 1;
        const lastSchedule = updatedSchedules[lastScheduleIndex];
        
        // Deduct the excess from the last payment schedule
        const newPercentageForLast = Math.max(0, (lastSchedule.percentage || 0) - excessPercentage);
        const newAmountForLast = (invoiceAmount * newPercentageForLast) / 100;
        
        updatedSchedules[lastScheduleIndex] = {
          ...lastSchedule,
          percentage: newPercentageForLast,
          amount: newAmountForLast
        };
        
        toast.success(`Adjusted previous payment by ${excessPercentage.toFixed(2)}% to accommodate new payment`);
      }
      
      // Add the new schedule
      const schedule: PaymentSchedule = {
        id: generateId(),
        description: description,
        dueDate: newSchedule.dueDate,
        percentage: percentage,
        status: newSchedule.status as PaymentStatus,
        amount: amount
      };

      onUpdateSchedules([...updatedSchedules, schedule]);
    } else {
      // Normal case - no adjustment needed
      const schedule: PaymentSchedule = {
        id: generateId(),
        description: description,
        dueDate: newSchedule.dueDate,
        percentage: percentage,
        status: newSchedule.status as PaymentStatus,
        amount: amount
      };

      onUpdateSchedules([...paymentSchedules, schedule]);
    }

    setNewSchedule({
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      percentage: 0,
      amount: 0,
      status: 'unpaid'
    });
    toast.success('Payment schedule added');
  };

  const removePaymentSchedule = (id: string) => {
    const updatedSchedules = paymentSchedules.filter(schedule => schedule.id !== id);
    
    // Regenerate descriptions for remaining schedules
    const reorderedSchedules = updatedSchedules.map((schedule, index) => ({
      ...schedule,
      description: `${getOrdinalNumber(index + 1)} payment`
    }));
    
    onUpdateSchedules(reorderedSchedules);
    toast.success('Payment schedule removed');
  };

  const updatePaymentSchedule = (id: string, field: keyof PaymentSchedule, value: any) => {
    const updatedSchedules = paymentSchedules.map(schedule => {
      if (schedule.id === id) {
        const updated = { ...schedule, [field]: value };
        
        // Sync percentage and amount
        if (field === 'percentage') {
          const numValue = Number(value);
          updated.amount = (invoiceAmount * numValue) / 100;
        } else if (field === 'amount') {
          const numValue = Number(value);
          updated.percentage = invoiceAmount > 0 ? (numValue / invoiceAmount) * 100 : 0;
        }
        
        return updated;
      }
      return schedule;
    });
    onUpdateSchedules(updatedSchedules);
  };

  const handleDateChange = (date: Date | undefined, field: string) => {
    if (date) {
      setNewSchedule(prev => ({ ...prev, [field]: format(date, 'yyyy-MM-dd') }));
    }
  };

  const handleNewSchedulePercentageChange = (value: string) => {
    const percentage = Number(value) || 0;
    const amount = (invoiceAmount * percentage) / 100;
    setNewSchedule(prev => ({ ...prev, percentage, amount }));
  };

  const handleNewScheduleAmountChange = (value: string) => {
    const amount = Number(value) || 0;
    const percentage = invoiceAmount > 0 ? (amount / invoiceAmount) * 100 : 0;
    setNewSchedule(prev => ({ ...prev, amount, percentage }));
  };

  // Set default description for new schedule when component mounts or schedules change
  useEffect(() => {
    setNewSchedule(prev => ({
      ...prev,
      description: getNextPaymentDescription()
    }));
  }, [paymentSchedules.length]);

  const totalPercentage = paymentSchedules.reduce((sum, schedule) => sum + (schedule.percentage || 0), 0);
  const totalAmount = paymentSchedules.reduce((sum, schedule) => sum + (schedule.amount || 0), 0);
  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.01;

  return (
    <Card className="mx-0">
      <CardHeader className="px-2 py-4 sm:px-6 sm:py-6">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Payment Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-2 pb-2 sm:px-6 sm:pb-6">
        {/* Existing Payment Schedules - Single Row Layout */}
        {paymentSchedules.length > 0 && (
          <div className="space-y-3">
            {paymentSchedules.map((schedule) => (
              <div key={schedule.id} className="grid grid-cols-6 gap-3 p-3 border rounded-lg items-end">
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <span className="font-medium text-sm block mt-1">{schedule.description}</span>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <DatePicker
                    mode="single"
                    selected={schedule.dueDate ? new Date(schedule.dueDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        updatePaymentSchedule(schedule.id, 'dueDate', format(date, 'yyyy-MM-dd'));
                      }
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Percentage</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={schedule.percentage || 0}
                      onChange={(e) => updatePaymentSchedule(schedule.id, 'percentage', Number(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.01"
                      className="pr-6"
                    />
                    <Percent className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={schedule.amount || 0}
                      onChange={(e) => updatePaymentSchedule(schedule.id, 'amount', Number(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="pr-6"
                    />
                    <DollarSign className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select
                    value={schedule.status}
                    onValueChange={(value) => updatePaymentSchedule(schedule.id, 'status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="write-off">Write-off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-center w-fit">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePaymentSchedule(schedule.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="flex justify-between items-center p-2 bg-muted rounded-lg sm:p-3">
              <div className="flex gap-4">
                <span className="text-sm font-medium">
                  Total: {totalPercentage.toFixed(2)}%
                </span>
                <span className="text-sm font-medium">
                  Amount: ${totalAmount.toFixed(2)}
                </span>
              </div>
              {!isPercentageValid && (
                <span className="text-sm text-red-500">
                  Must equal 100%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Add New Payment Schedule - Single Row Layout */}
        <div className="space-y-3 p-2 border rounded-lg bg-muted/50 sm:p-4">
          <Label className="text-sm font-medium">Add Payment Schedule</Label>
          <div className="grid grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <DatePicker
                mode="single"
                selected={newSchedule.dueDate ? new Date(newSchedule.dueDate) : undefined}
                onSelect={(date) => handleDateChange(date, 'dueDate')}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Percentage</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={newSchedule.percentage || ''}
                  onChange={(e) => handleNewSchedulePercentageChange(e.target.value)}
                  placeholder="Percentage"
                  min="0"
                  max="100"
                  step="0.01"
                  className="pr-6"
                />
                <Percent className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={newSchedule.amount || ''}
                  onChange={(e) => handleNewScheduleAmountChange(e.target.value)}
                  placeholder="Amount"
                  min="0"
                  step="0.01"
                  className="pr-6"
                />
                <DollarSign className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={newSchedule.status || 'unpaid'}
                onValueChange={(value) => setNewSchedule(prev => ({ ...prev, status: value as PaymentStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="write-off">Write-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button onClick={addPaymentSchedule} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentScheduleManager;
