
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {  Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentSchedule } from '@/types';
import { toast } from 'sonner';
import { usePaymentScheduleManager } from './hooks/usePaymentScheduleManager';
import PaymentScheduleRow from './components/PaymentScheduleRow';
import AddPaymentScheduleForm from './components/AddPaymentScheduleForm';
import { validatePaymentSchedule, adjustSchedulesForNewPayment } from './utils/paymentScheduleUtils';

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
  const {
    newSchedule,
    setNewSchedule,
    isAddingSchedule,
    setIsAddingSchedule,
    inputValues,
    setInputValues,
    generateId,
    getNextPaymentDescription,
    updatePaymentSchedule,
    removePaymentSchedule
  } = usePaymentScheduleManager({
    paymentSchedules,
    invoiceAmount,
    onUpdateSchedules
  });

  const addPaymentSchedule = () => {
    const validation = validatePaymentSchedule(newSchedule, paymentSchedules, invoiceAmount);
    
    if (!validation.isValid) {
      toast.error(validation.errorMessage);
      return;
    }

    const updatedSchedules = adjustSchedulesForNewPayment(
      newSchedule,
      paymentSchedules,
      invoiceAmount,
      generateId
    );

    onUpdateSchedules(updatedSchedules);
    setIsAddingSchedule(false);
    setNewSchedule({
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      status: 'unpaid'
    });
    toast.success('Payment schedule added');
  };

  const handleInputValueChange = (key: string, value: string) => {
    setInputValues(prev => ({ ...prev, [key]: value }));
  };

  const handleInputBlur = (key: string) => {
    setInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[key];
      return newValues;
    });
  };

  const handleUpdateNewSchedule = (field: keyof PaymentSchedule, value: any) => {
    setNewSchedule(prev => ({ ...prev, [field]: value }));
  };

  // Set default description for new schedule when component mounts or schedules change
  useEffect(() => {
    setNewSchedule(prev => ({
      ...prev,
      description: getNextPaymentDescription()
    }));
  }, [paymentSchedules.length, getNextPaymentDescription]);

  // Calculate totals based on stored amounts
  const totalAmount = paymentSchedules.reduce((sum, schedule) => sum + (schedule.amount || 0), 0);
  const totalPercentage = invoiceAmount > 0 ? (totalAmount / invoiceAmount) * 100 : 0;
  const isAmountValid = Math.abs(totalAmount - invoiceAmount) < 0.01;

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
                  <PaymentScheduleRow
                    key={schedule.id}
                    schedule={schedule}
                    invoiceAmount={invoiceAmount}
                    inputValues={inputValues}
                    onUpdateSchedule={updatePaymentSchedule}
                    onRemoveSchedule={removePaymentSchedule}
                    onInputValueChange={handleInputValueChange}
                    onInputBlur={handleInputBlur}
                  />
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
              {!isAmountValid && (
                <span className="text-sm text-red-500">
                  Must equal invoice amount (${invoiceAmount.toFixed(2)})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Add New Payment Schedule Button / Form */}
        {isAddingSchedule ? (
          <AddPaymentScheduleForm
            newSchedule={newSchedule}
            invoiceAmount={invoiceAmount}
            inputValues={inputValues}
            onUpdateNewSchedule={handleUpdateNewSchedule}
            onAddSchedule={addPaymentSchedule}
            onCancel={() => setIsAddingSchedule(false)}
            onInputValueChange={handleInputValueChange}
            onInputBlur={handleInputBlur}
          />
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
