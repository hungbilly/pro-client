
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
  if (!newSchedule.dueDate || !newSchedule.amount) {
    return { isValid: false, errorMessage: 'Please fill in all fields' };
  }

  const amount = newSchedule.amount;

  if (amount <= 0) {
    return { isValid: false, errorMessage: 'Amount must be greater than 0' };
  }

  const totalCurrentAmount = paymentSchedules.reduce((sum, schedule) => sum + (schedule.amount || 0), 0);
  
  // Check if adding this would exceed invoice amount
  if (totalCurrentAmount + amount > invoiceAmount) {
    // Find if there's an unpaid schedule that can be adjusted
    const hasUnpaidSchedule = paymentSchedules.some(schedule => schedule.status !== 'paid');
    if (!hasUnpaidSchedule) {
      return { isValid: false, errorMessage: 'Cannot add payment: would exceed invoice amount and all existing payments are paid' };
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
  const amount = newSchedule.amount || 0;
  const percentage = invoiceAmount > 0 ? (amount / invoiceAmount) * 100 : 0;

  const totalCurrentAmount = paymentSchedules.reduce((sum, schedule) => sum + (schedule.amount || 0), 0);
  const description = getNextPaymentDescription(paymentSchedules.length);
  
  // If adding this would exceed invoice amount, adjust the previous payment schedule
  if (totalCurrentAmount + amount > invoiceAmount) {
    const excessAmount = (totalCurrentAmount + amount) - invoiceAmount;
    
    // Find the last unpaid payment schedule to deduct from
    const updatedSchedules = [...paymentSchedules];
    let adjustmentMade = false;
    
    for (let i = updatedSchedules.length - 1; i >= 0; i--) {
      const schedule = updatedSchedules[i];
      if (schedule.status !== 'paid') {
        const newAmountForSchedule = Math.max(0, (schedule.amount || 0) - excessAmount);
        const newPercentageForSchedule = invoiceAmount > 0 ? (newAmountForSchedule / invoiceAmount) * 100 : 0;
        
        updatedSchedules[i] = {
          ...schedule,
          amount: newAmountForSchedule,
          percentage: newPercentageForSchedule
        };
        
        adjustmentMade = true;
        toast.success(`Adjusted previous unpaid payment by $${excessAmount.toFixed(2)} to accommodate new payment`);
        break;
      }
    }
    
    // Add the new schedule
    const schedule: PaymentSchedule = {
      id: generateId(),
      description: description,
      dueDate: newSchedule.dueDate!,
      amount: amount,
      percentage: percentage,
      status: newSchedule.status || 'unpaid'
    };

    return [...updatedSchedules, schedule];
  } else {
    // Normal case - no adjustment needed
    const schedule: PaymentSchedule = {
      id: generateId(),
      description: description,
      dueDate: newSchedule.dueDate!,
      amount: amount,
      percentage: percentage,
      status: newSchedule.status || 'unpaid'
    };

    return [...paymentSchedules, schedule];
  }
};
