import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Trash2, Plus, Calendar, Percent, DollarSign, X } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentSchedule, PaymentStatus } from '@/types';
import { toast } from 'sonner';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);

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

  // Smart payment schedule adjustment when invoice amount changes
  useEffect(() => {
    if (paymentSchedules.length > 0 && invoiceAmount > 0) {
      console.log('PaymentScheduleManager: Invoice amount changed to:', invoiceAmount);
      console.log('PaymentScheduleManager: Current schedules:', paymentSchedules);
      
      // Separate paid and unpaid schedules
      const paidSchedules = paymentSchedules.filter(schedule => schedule.status === 'paid');
      const unpaidSchedules = paymentSchedules.filter(schedule => schedule.status !== 'paid');
      
      console.log('PaymentScheduleManager: Paid schedules:', paidSchedules);
      console.log('PaymentScheduleManager: Unpaid schedules:', unpaidSchedules);
      
      // Calculate total paid amount - use the ACTUAL amount stored in paid schedules
      const totalPaidAmount = paidSchedules.reduce((sum, schedule) => {
        const amount = schedule.amount || 0;
        console.log(`PaymentScheduleManager: Paid schedule ${schedule.id} amount:`, amount);
        return sum + amount;
      }, 0);
      
      console.log('PaymentScheduleManager: Total paid amount:', totalPaidAmount);
      
      // Calculate remaining amount for unpaid schedules
      const remainingAmount = invoiceAmount - totalPaidAmount;
      
      console.log('PaymentScheduleManager: Remaining amount for unpaid:', remainingAmount);
      
      // Handle edge cases
      if (remainingAmount < 0) {
        toast.error('Invoice total is less than already paid amounts. Please adjust manually.');
        return;
      }
      
      if (unpaidSchedules.length === 0) {
        // All payments are paid, just recalculate percentages for paid schedules
        const updatedSchedules = paymentSchedules.map(schedule => {
          if (schedule.status === 'paid') {
            const preservedAmount = schedule.amount || 0;
            const newPercentage = invoiceAmount > 0 ? (preservedAmount / invoiceAmount) * 100 : 0;
            
            console.log(`PaymentScheduleManager: Updating paid schedule ${schedule.id} - preserving amount:`, preservedAmount, 'new percentage:', newPercentage);
            
            return {
              ...schedule,
              amount: preservedAmount, // Explicitly preserve the amount
              percentage: newPercentage
            };
          }
          return schedule;
        });
        
        const hasPercentageChanges = updatedSchedules.some((schedule, index) => 
          Math.abs((schedule.percentage || 0) - (paymentSchedules[index].percentage || 0)) > 0.01
        );
        
        if (hasPercentageChanges) {
          console.log('PaymentScheduleManager: Updating schedules with preserved paid amounts');
          onUpdateSchedules(updatedSchedules);
        }
        return;
      }
      
      // Calculate total current unpaid percentage to maintain proportions
      const totalUnpaidPercentage = unpaidSchedules.reduce((sum, schedule) => sum + (schedule.percentage || 0), 0);
      
      console.log('PaymentScheduleManager: Total unpaid percentage:', totalUnpaidPercentage);
      
      // Distribute remaining amount proportionally among unpaid schedules
      const updatedSchedules = paymentSchedules.map(schedule => {
        if (schedule.status === 'paid') {
          // CRITICAL: Keep paid schedules unchanged in amount, just update percentage
          const preservedAmount = schedule.amount || 0;
          const newPercentage = invoiceAmount > 0 ? (preservedAmount / invoiceAmount) * 100 : 0;
          
          console.log(`PaymentScheduleManager: Preserving paid schedule ${schedule.id} - amount:`, preservedAmount, 'percentage:', newPercentage);
          
          return {
            ...schedule,
            amount: preservedAmount, // Explicitly preserve the paid amount
            percentage: newPercentage
          };
        } else {
          // Distribute remaining amount proportionally for unpaid schedules
          const currentProportion = totalUnpaidPercentage > 0 ? (schedule.percentage || 0) / totalUnpaidPercentage : 1 / unpaidSchedules.length;
          const newAmount = remainingAmount * currentProportion;
          const newPercentage = invoiceAmount > 0 ? (newAmount / invoiceAmount) * 100 : 0;
          
          console.log(`PaymentScheduleManager: Updating unpaid schedule ${schedule.id} - new amount:`, newAmount, 'new percentage:', newPercentage);
          
          return {
            ...schedule,
            amount: newAmount,
            percentage: newPercentage
          };
        }
      });
      
      // Only update if amounts actually changed
      const hasAmountChanges = updatedSchedules.some((schedule, index) => {
        const originalSchedule = paymentSchedules[index];
        const amountChanged = Math.abs((schedule.amount || 0) - (originalSchedule.amount || 0)) > 0.01;
        const percentageChanged = Math.abs((schedule.percentage || 0) - (originalSchedule.percentage || 0)) > 0.01;
        
        if (amountChanged || percentageChanged) {
          console.log(`PaymentScheduleManager: Schedule ${schedule.id} changed - amount: ${originalSchedule.amount || 0} -> ${schedule.amount || 0}, percentage: ${originalSchedule.percentage || 0} -> ${schedule.percentage || 0}`);
        }
        
        return amountChanged || percentageChanged;
      });
      
      if (hasAmountChanges) {
        console.log('PaymentScheduleManager: Applying payment schedule updates');
        onUpdateSchedules(updatedSchedules);
        
        // Show notification about adjustment
        const paidCount = paidSchedules.length;
        const unpaidCount = unpaidSchedules.length;
        if (paidCount > 0 && unpaidCount > 0) {
          toast.success(`Payment schedules adjusted. ${paidCount} paid payment(s) unchanged, ${unpaidCount} unpaid payment(s) redistributed.`);
        }
      } else {
        console.log('PaymentScheduleManager: No changes needed');
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
      
      // Find the last unpaid payment schedule to deduct from
      const updatedSchedules = [...paymentSchedules];
      let adjustmentMade = false;
      
      for (let i = updatedSchedules.length - 1; i >= 0; i--) {
        const schedule = updatedSchedules[i];
        if (schedule.status !== 'paid') {
          const newPercentageForSchedule = Math.max(0, (schedule.percentage || 0) - excessPercentage);
          const newAmountForSchedule = (invoiceAmount * newPercentageForSchedule) / 100;
          
          updatedSchedules[i] = {
            ...schedule,
            percentage: newPercentageForSchedule,
            amount: newAmountForSchedule
          };
          
          adjustmentMade = true;
          toast.success(`Adjusted previous unpaid payment by ${excessPercentage.toFixed(2)}% to accommodate new payment`);
          break;
        }
      }
      
      if (!adjustmentMade) {
        toast.error('Cannot add payment: would exceed 100% and all existing payments are paid');
        return;
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

    setIsAddingSchedule(false);
    setNewSchedule({
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      percentage: 0,
      amount: 0,
      status: 'unpaid'
    });
    toast.success('Payment schedule added');
  };

  const removePaymentSchedule = (id: string) => {
    const scheduleToRemove = paymentSchedules.find(s => s.id === id);
    if (scheduleToRemove?.status === 'paid') {
      toast.error('Cannot remove a paid payment schedule');
      return;
    }
    
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
    const scheduleToUpdate = paymentSchedules.find(s => s.id === id);
    
    // Special handling for status changes to "paid"
    if (field === 'status' && value === 'paid' && scheduleToUpdate?.status !== 'paid') {
      console.log(`PaymentScheduleManager: Marking schedule ${id} as paid`);
      
      // Calculate the correct amount based on percentage if current amount is 0 or undefined
      let currentAmount = scheduleToUpdate.amount || 0;
      if (currentAmount === 0 && scheduleToUpdate.percentage && invoiceAmount > 0) {
        currentAmount = (invoiceAmount * scheduleToUpdate.percentage) / 100;
        console.log(`PaymentScheduleManager: Calculated amount for paid schedule: ${currentAmount} (${scheduleToUpdate.percentage}% of ${invoiceAmount})`);
      }
      
      const newPercentage = invoiceAmount > 0 ? (currentAmount / invoiceAmount) * 100 : 0;
      
      const updatedSchedules = paymentSchedules.map(schedule => {
        if (schedule.id === id) {
          return {
            ...schedule,
            status: value,
            amount: currentAmount, // Use calculated amount
            percentage: newPercentage // Update percentage to match
          };
        }
        return schedule;
      });
      
      onUpdateSchedules(updatedSchedules);
      return;
    }
    
    // Prevent editing amount/percentage for paid schedules
    if (scheduleToUpdate?.status === 'paid' && (field === 'amount' || field === 'percentage')) {
      toast.error('Cannot modify amount or percentage of a paid payment schedule');
      return;
    }
    
    const updatedSchedules = paymentSchedules.map(schedule => {
      if (schedule.id === id) {
        const updated = { ...schedule, [field]: value };
        
        // Sync percentage and amount only for unpaid schedules
        if (schedule.status !== 'paid') {
          if (field === 'percentage') {
            const numValue = Number(value);
            updated.amount = (invoiceAmount * numValue) / 100;
          } else if (field === 'amount') {
            const numValue = Number(value);
            updated.percentage = invoiceAmount > 0 ? (numValue / invoiceAmount) * 100 : 0;
          }
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
        {/* Existing Payment Schedules - Elegant grid layout with consistent spacing */}
        {paymentSchedules.length > 0 && (
          <div className="space-y-3">
            <ScrollArea className="w-full">
              <div className="space-y-3 py-1 min-w-[700px]">
                {paymentSchedules.map((schedule) => (
                  <div key={schedule.id} className={`grid grid-cols-[120px_160px_100px_120px_120px_auto] gap-4 p-3 border rounded-lg items-end ${schedule.status === 'paid' ? 'bg-green-50 border-green-200' : ''}`}>
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <span className="font-medium text-sm block mt-1 truncate" title={schedule.description}>
                        {schedule.description}
                        {schedule.status === 'paid' && <span className="ml-1 text-green-600 text-xs">(Paid)</span>}
                      </span>
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
                        hideIcon={true}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">%</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={Number(schedule.percentage || 0).toFixed(2)}
                          onChange={(e) => updatePaymentSchedule(schedule.id, 'percentage', Number(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.01"
                          className="pr-5 text-sm"
                          disabled={schedule.status === 'paid'}
                        />
                        <Percent className="absolute right-1.5 top-2.5 h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Amount</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={Number(schedule.amount || 0).toFixed(2)}
                          onChange={(e) => updatePaymentSchedule(schedule.id, 'amount', Number(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          className="pr-5 text-sm"
                          disabled={schedule.status === 'paid'}
                        />
                        <DollarSign className="absolute right-1.5 top-2.5 h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select
                        value={schedule.status}
                        onValueChange={(value) => updatePaymentSchedule(schedule.id, 'status', value)}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="write-off">Write-off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePaymentSchedule(schedule.id)}
                        className="text-red-500 hover:text-red-700 p-1 h-8 w-8"
                        disabled={schedule.status === 'paid'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            
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

        {/* Add New Payment Schedule Button / Form */}
        {isAddingSchedule ? (
          <div className="space-y-3 p-2 border rounded-lg bg-muted/50 sm:p-4">
            <Label className="text-sm font-medium">Add Payment Schedule</Label>
            <ScrollArea className="w-full">
              <div className="grid grid-cols-[120px_160px_100px_120px_120px_auto] gap-4 items-end pt-2 min-w-[700px]">
                <div className="col-start-2">
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <DatePicker
                    mode="single"
                    selected={newSchedule.dueDate ? new Date(newSchedule.dueDate) : undefined}
                    onSelect={(date) => handleDateChange(date, 'dueDate')}
                    hideIcon={true}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">%</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={newSchedule.percentage || ''}
                      onChange={(e) => handleNewSchedulePercentageChange(e.target.value)}
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.01"
                      className="pr-5 text-sm"
                    />
                    <Percent className="absolute right-1.5 top-2.5 h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={newSchedule.amount || ''}
                      onChange={(e) => handleNewScheduleAmountChange(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="pr-5 text-sm"
                    />
                    <DollarSign className="absolute right-1.5 top-2.5 h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select
                    value={newSchedule.status || 'unpaid'}
                    onValueChange={(value) => setNewSchedule(prev => ({ ...prev, status: value as PaymentStatus }))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="write-off">Write-off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 items-center">
                  <Button onClick={addPaymentSchedule} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsAddingSchedule(false)}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Cancel</span>
                  </Button>
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        ) : (
          <div className="pt-2">
            <Button
              onClick={() => setIsAddingSchedule(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Schedule
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentScheduleManager;
