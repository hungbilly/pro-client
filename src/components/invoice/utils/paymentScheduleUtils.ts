
import { PaymentSchedule } from '@/types';
import { toast } from 'sonner';

export const generatePaymentId = () => `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const getOrdinalNumber = (num: number): string => {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
};

export const getNextPaymentDescription = (schedulesCount: number) => {
  const count = schedulesCount + 1;
  return `${getOrdinalNumber(count)} payment`;
};

export const validatePaymentSchedule = (
  newSchedule: Partial<PaymentSchedule>,
  paymentSchedules: PaymentSchedule[],
  invoiceAmount: number
): { isValid: boolean; errorMessage?: string } => {
  if (!newSchedule.dueDate || (!newSchedule.percentage && !newSchedule.amount)) {
    return { isValid: false, errorMessage: 'Please fill in all fields' };
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
    return { isValid: false, errorMessage: 'Percentage must be between 1 and 100' };
  }

  const totalCurrentPercentage = paymentSchedules.reduce((sum, schedule) => sum + (schedule.percentage || 0), 0);
  
  // Check if adding this would exceed 100%
  if (totalCurrentPercentage + percentage > 100) {
    // Find if there's an unpaid schedule that can be adjusted
    const hasUnpaidSchedule = paymentSchedules.some(schedule => schedule.status !== 'paid');
    if (!hasUnpaidSchedule) {
      return { isValid: false, errorMessage: 'Cannot add payment: would exceed 100% and all existing payments are paid' };
    }
  }

  return { isValid: true };
};

export const adjustSchedulesForNewPayment = (
  newSchedule: Partial<PaymentSchedule>,
  paymentSchedules: PaymentSchedule[],
  invoiceAmount: number,
  generateId: () => string
): PaymentSchedule[] => {
  // Calculate percentage from amount or vice versa
  let percentage = newSchedule.percentage || 0;
  let amount = newSchedule.amount || 0;

  if (amount > 0 && invoiceAmount > 0) {
    percentage = (amount / invoiceAmount) * 100;
  } else if (percentage > 0) {
    amount = (invoiceAmount * percentage) / 100;
  }

  const totalCurrentPercentage = paymentSchedules.reduce((sum, schedule) => sum + (schedule.percentage || 0), 0);
  const description = getNextPaymentDescription(paymentSchedules.length);
  
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
    
    // Add the new schedule
    const schedule: PaymentSchedule = {
      id: generateId(),
      description: description,
      dueDate: newSchedule.dueDate!,
      percentage: percentage,
      status: newSchedule.status || 'unpaid',
      amount: amount
    };

    return [...updatedSchedules, schedule];
  } else {
    // Normal case - no adjustment needed
    const schedule: PaymentSchedule = {
      id: generateId(),
      description: description,
      dueDate: newSchedule.dueDate!,
      percentage: percentage,
      status: newSchedule.status || 'unpaid',
      amount: amount
    };

    return [...paymentSchedules, schedule];
  }
};
