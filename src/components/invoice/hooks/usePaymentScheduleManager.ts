import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { PaymentSchedule, PaymentStatus } from '@/types';
import { toast } from 'sonner';

interface UsePaymentScheduleManagerProps {
  paymentSchedules: PaymentSchedule[];
  invoiceAmount: number;
  onUpdateSchedules: (schedules: PaymentSchedule[]) => void;
}

export const usePaymentScheduleManager = ({
  paymentSchedules,
  invoiceAmount,
  onUpdateSchedules
}: UsePaymentScheduleManagerProps) => {
  const [newSchedule, setNewSchedule] = useState<Partial<PaymentSchedule>>({
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    status: 'unpaid'
  });
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [inputValues, setInputValues] = useState<{[key: string]: string}>({});

  // Initialize with default payment schedule if none exist
  useEffect(() => {
    if (paymentSchedules.length === 0) {
      const defaultSchedule: PaymentSchedule = {
        id: generateId(),
        description: '1st payment',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        amount: invoiceAmount,
        percentage: 100,
        status: 'unpaid'
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
      
      // Calculate total paid amount - keep paid amounts unchanged
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
            // For paid schedules, preserve the amount and update percentage
            const preservedAmount = schedule.amount || 0;
            const newPercentage = invoiceAmount > 0 ? (preservedAmount / invoiceAmount) * 100 : 0;
            
            console.log(`PaymentScheduleManager: Updating paid schedule ${schedule.id} - preserving amount:`, preservedAmount, 'new percentage:', newPercentage);
            
            return {
              ...schedule,
              amount: preservedAmount,
              percentage: newPercentage
            };
          }
          return schedule;
        });
        
        const hasChanges = updatedSchedules.some((schedule, index) => {
          const original = paymentSchedules[index];
          return Math.abs((schedule.percentage || 0) - (original.percentage || 0)) > 0.01;
        });
        
        if (hasChanges) {
          console.log('PaymentScheduleManager: Updating schedules with preserved paid amounts');
          onUpdateSchedules(updatedSchedules);
        }
        return;
      }
      
      // Calculate total current unpaid amount to maintain proportions
      const totalUnpaidAmount = unpaidSchedules.reduce((sum, schedule) => sum + (schedule.amount || 0), 0);
      
      console.log('PaymentScheduleManager: Total unpaid amount:', totalUnpaidAmount);
      
      // Distribute remaining amount proportionally among unpaid schedules
      const updatedSchedules = paymentSchedules.map(schedule => {
        if (schedule.status === 'paid') {
          // Keep paid schedules unchanged in amount, just update percentage
          const preservedAmount = schedule.amount || 0;
          const newPercentage = invoiceAmount > 0 ? (preservedAmount / invoiceAmount) * 100 : 0;
          
          console.log(`PaymentScheduleManager: Preserving paid schedule ${schedule.id} - amount:`, preservedAmount, 'percentage:', newPercentage);
          
          return {
            ...schedule,
            amount: preservedAmount,
            percentage: newPercentage
          };
        } else {
          // Distribute remaining amount proportionally for unpaid schedules
          const currentProportion = totalUnpaidAmount > 0 ? (schedule.amount || 0) / totalUnpaidAmount : 1 / unpaidSchedules.length;
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

  const updatePaymentSchedule = (id: string, field: keyof PaymentSchedule, value: any) => {
    const scheduleToUpdate = paymentSchedules.find(s => s.id === id);
    
    // Special handling for status changes to "paid"
    if (field === 'status' && value === 'paid' && scheduleToUpdate?.status !== 'paid') {
      console.log(`PaymentScheduleManager: Marking schedule ${id} as paid`);
      
      // Keep the current amount unchanged when marking as paid
      const currentAmount = scheduleToUpdate.amount || 0;
      const newPercentage = invoiceAmount > 0 ? (currentAmount / invoiceAmount) * 100 : 0;
      
      const updatedSchedules = paymentSchedules.map(schedule => {
        if (schedule.id === id) {
          return {
            ...schedule,
            status: value,
            amount: currentAmount,
            percentage: newPercentage
          };
        }
        return schedule;
      });
      
      onUpdateSchedules(updatedSchedules);
      return;
    }
    
    // Prevent editing amount for paid schedules
    if (scheduleToUpdate?.status === 'paid' && (field === 'amount' || field === 'percentage')) {
      toast.error('Cannot modify amount or percentage of a paid payment schedule');
      return;
    }
    
    const updatedSchedules = paymentSchedules.map(schedule => {
      if (schedule.id === id) {
        const updated = { ...schedule, [field]: value };
        
        // Sync percentage and amount only for unpaid schedules
        if (schedule.status !== 'paid') {
          if (field === 'amount') {
            const numValue = Number(value);
            updated.amount = numValue;
            updated.percentage = invoiceAmount > 0 ? (numValue / invoiceAmount) * 100 : 0;
          } else if (field === 'percentage') {
            const numValue = Number(value);
            updated.percentage = numValue;
            updated.amount = (invoiceAmount * numValue) / 100;
          }
        }
        
        return updated;
      }
      return schedule;
    });
    onUpdateSchedules(updatedSchedules);
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

  return {
    newSchedule,
    setNewSchedule,
    isAddingSchedule,
    setIsAddingSchedule,
    inputValues,
    setInputValues,
    generateId,
    getOrdinalNumber,
    getNextPaymentDescription,
    updatePaymentSchedule,
    removePaymentSchedule
  };
};
