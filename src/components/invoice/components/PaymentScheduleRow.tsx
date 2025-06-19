
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Trash2, Percent, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentSchedule, PaymentStatus } from '@/types';

interface PaymentScheduleRowProps {
  schedule: PaymentSchedule;
  invoiceAmount: number;
  inputValues: {[key: string]: string};
  onUpdateSchedule: (id: string, field: keyof PaymentSchedule, value: any) => void;
  onRemoveSchedule: (id: string) => void;
  onInputValueChange: (key: string, value: string) => void;
  onInputBlur: (key: string) => void;
}

const PaymentScheduleRow: React.FC<PaymentScheduleRowProps> = ({
  schedule,
  invoiceAmount,
  inputValues,
  onUpdateSchedule,
  onRemoveSchedule,
  onInputValueChange,
  onInputBlur
}) => {
  const handleExistingScheduleAmountChange = (scheduleId: string, value: string) => {
    // Store the raw input value to prevent cursor jumping
    onInputValueChange(scheduleId, value);
    
    // Only update when it's a valid number
    const cleanValue = value.replace(/[^\d.]/g, '');
    if (cleanValue && !isNaN(Number(cleanValue))) {
      onUpdateSchedule(scheduleId, 'amount', Number(cleanValue));
    }
  };

  return (
    <div className={`grid grid-cols-[120px_160px_100px_120px_120px_auto] gap-4 p-3 border rounded-lg items-end ${schedule.status === 'paid' ? 'bg-green-50 border-green-200' : ''}`}>
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
              onUpdateSchedule(schedule.id, 'dueDate', format(date, 'yyyy-MM-dd'));
            }
          }}
          hideIcon={true}
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">%</Label>
        <div className="relative">
          <Input
            type="text"
            inputMode="numeric"
            value={Math.round(schedule.percentage || 0).toString()}
            onChange={(e) => {
              // Only allow integers for editing
              const intValue = e.target.value.replace(/[^\d]/g, '');
              const percentage = Number(intValue) || 0;
              onUpdateSchedule(schedule.id, 'percentage', percentage);
            }}
            placeholder="0"
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
            type="text"
            inputMode="decimal"
            value={inputValues[schedule.id] ?? Number(schedule.amount || 0).toFixed(2)}
            onChange={(e) => {
              handleExistingScheduleAmountChange(schedule.id, e.target.value);
            }}
            onBlur={() => {
              onInputBlur(schedule.id);
            }}
            placeholder="0.00"
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
          onValueChange={(value) => onUpdateSchedule(schedule.id, 'status', value)}
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
          onClick={() => onRemoveSchedule(schedule.id)}
          className="text-red-500 hover:text-red-700 p-1 h-8 w-8"
          disabled={schedule.status === 'paid'}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PaymentScheduleRow;
