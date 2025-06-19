
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus, X, Percent, DollarSign } from 'lucide-react';
import { PaymentSchedule, PaymentStatus } from '@/types';

interface AddPaymentScheduleFormProps {
  newSchedule: Partial<PaymentSchedule>;
  invoiceAmount: number;
  inputValues: {[key: string]: string};
  onUpdateNewSchedule: (field: keyof PaymentSchedule, value: any) => void;
  onAddSchedule: () => void;
  onCancel: () => void;
  onInputValueChange: (key: string, value: string) => void;
  onInputBlur: (key: string) => void;
}

const AddPaymentScheduleForm: React.FC<AddPaymentScheduleFormProps> = ({
  newSchedule,
  invoiceAmount,
  inputValues,
  onUpdateNewSchedule,
  onAddSchedule,
  onCancel,
  onInputValueChange,
  onInputBlur
}) => {
  const handleDateChange = (date: Date | undefined, field: string) => {
    if (date) {
      onUpdateNewSchedule(field as keyof PaymentSchedule, date.toISOString().split('T')[0]);
    }
  };

  const handleNewSchedulePercentageChange = (value: string) => {
    // Store the raw input value to prevent cursor jumping
    onInputValueChange('newSchedulePercentage', value);
    
    // Only update the actual amount when it's a valid number
    const cleanValue = value.replace(/[^\d.]/g, '');
    if (cleanValue && !isNaN(Number(cleanValue))) {
      const percentage = Number(cleanValue);
      const amount = (invoiceAmount * percentage) / 100;
      onUpdateNewSchedule('amount', amount);
    }
  };

  const handleNewScheduleAmountChange = (value: string) => {
    // Store the raw input value to prevent cursor jumping
    onInputValueChange('newScheduleAmount', value);
    
    // Only update the actual amount when it's a valid number
    const cleanValue = value.replace(/[^\d.]/g, '');
    const amount = Number(cleanValue) || 0;
    onUpdateNewSchedule('amount', amount);
  };

  // Calculate percentage for display - always derive from stored amount
  const displayPercentage = invoiceAmount > 0 ? ((newSchedule.amount || 0) / invoiceAmount) * 100 : 0;

  return (
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
                type="text"
                inputMode="numeric"
                value={inputValues.newSchedulePercentage ?? Math.round(displayPercentage).toString()}
                onChange={(e) => {
                  handleNewSchedulePercentageChange(e.target.value);
                }}
                onBlur={() => {
                  onInputBlur('newSchedulePercentage');
                }}
                placeholder="0"
                className="pr-5 text-sm"
              />
              <Percent className="absolute right-1.5 top-2.5 h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Amount</Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={inputValues.newScheduleAmount ?? (newSchedule.amount || '')}
                onChange={(e) => {
                  handleNewScheduleAmountChange(e.target.value);
                }}
                onBlur={() => {
                  onInputBlur('newScheduleAmount');
                }}
                placeholder="0.00"
                className="pr-5 text-sm"
              />
              <DollarSign className="absolute right-1.5 top-2.5 h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={newSchedule.status || 'unpaid'}
              onValueChange={(value) => onUpdateNewSchedule('status', value as PaymentStatus)}
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
            <Button onClick={onAddSchedule} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default AddPaymentScheduleForm;
