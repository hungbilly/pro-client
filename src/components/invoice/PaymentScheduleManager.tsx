
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Trash2, Plus, Calendar, Percent } from 'lucide-react';
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
    description: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    percentage: 0,
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

  const generateId = () => `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getNextPaymentDescription = () => {
    const count = paymentSchedules.length + 1;
    const ordinals = ['1st', '2nd', '3rd'];
    const ordinal = ordinals[count - 1] || `${count}th`;
    return `${ordinal} payment`;
  };

  const addPaymentSchedule = () => {
    if (!newSchedule.description || !newSchedule.dueDate || !newSchedule.percentage) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newSchedule.percentage <= 0 || newSchedule.percentage > 100) {
      toast.error('Percentage must be between 1 and 100');
      return;
    }

    const totalCurrentPercentage = paymentSchedules.reduce((sum, schedule) => sum + (schedule.percentage || 0), 0);
    if (totalCurrentPercentage + newSchedule.percentage > 100) {
      toast.error('Total percentage cannot exceed 100%');
      return;
    }

    const schedule: PaymentSchedule = {
      id: generateId(),
      description: newSchedule.description,
      dueDate: newSchedule.dueDate,
      percentage: newSchedule.percentage,
      status: newSchedule.status as PaymentStatus,
      amount: (invoiceAmount * newSchedule.percentage) / 100
    };

    onUpdateSchedules([...paymentSchedules, schedule]);
    setNewSchedule({
      description: getNextPaymentDescription(),
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      percentage: 0,
      status: 'unpaid'
    });
    toast.success('Payment schedule added');
  };

  const removePaymentSchedule = (id: string) => {
    onUpdateSchedules(paymentSchedules.filter(schedule => schedule.id !== id));
    toast.success('Payment schedule removed');
  };

  const updatePaymentSchedule = (id: string, field: keyof PaymentSchedule, value: any) => {
    const updatedSchedules = paymentSchedules.map(schedule => {
      if (schedule.id === id) {
        const updated = { ...schedule, [field]: value };
        if (field === 'percentage') {
          updated.amount = (invoiceAmount * value) / 100;
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

  // Set default description for new schedule when component mounts or schedules change
  useEffect(() => {
    setNewSchedule(prev => ({
      ...prev,
      description: getNextPaymentDescription()
    }));
  }, [paymentSchedules.length]);

  const totalPercentage = paymentSchedules.reduce((sum, schedule) => sum + (schedule.percentage || 0), 0);
  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.01;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Payment Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Payment Schedules */}
        {paymentSchedules.length > 0 && (
          <div className="space-y-3">
            {paymentSchedules.map((schedule) => (
              <div key={schedule.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <Input
                    value={schedule.description}
                    onChange={(e) => updatePaymentSchedule(schedule.id, 'description', e.target.value)}
                    placeholder="Payment description"
                  />
                </div>
                <div className="w-32">
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
                <div className="w-24">
                  <div className="relative">
                    <Input
                      type="number"
                      value={schedule.percentage}
                      onChange={(e) => updatePaymentSchedule(schedule.id, 'percentage', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      max="100"
                      className="pr-6"
                    />
                    <Percent className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="w-32">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePaymentSchedule(schedule.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                Total: {totalPercentage.toFixed(2)}%
              </span>
              {!isPercentageValid && (
                <span className="text-sm text-red-500">
                  Must equal 100%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Add New Payment Schedule */}
        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <Label className="text-sm font-medium">Add Payment Schedule</Label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Input
                value={newSchedule.description || ''}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Payment description"
              />
            </div>
            <div>
              <DatePicker
                mode="single"
                selected={newSchedule.dueDate ? new Date(newSchedule.dueDate) : undefined}
                onSelect={(date) => handleDateChange(date, 'dueDate')}
              />
            </div>
            <div className="relative">
              <Input
                type="number"
                value={newSchedule.percentage || ''}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, percentage: parseFloat(e.target.value) || 0 }))}
                placeholder="Percentage"
                min="0"
                max="100"
                className="pr-6"
              />
              <Percent className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            <Button onClick={addPaymentSchedule} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentScheduleManager;
