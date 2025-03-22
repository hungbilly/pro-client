
import React, { memo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { PaymentSchedule } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentScheduleTableProps {
  paymentSchedules: PaymentSchedule[];
  amount: number;
  isClientView: boolean;
  updatingPaymentId: string | null;
  onUpdateStatus: (paymentId: string, status: 'paid' | 'unpaid' | 'write-off') => void;
  formatCurrency: (amount: number) => string;
  onUpdatePaymentDate?: (paymentId: string, paymentDate: string) => void;
}

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

  const handleDateSelect = (paymentId: string, date: Date | undefined) => {
    if (!date || !onUpdatePaymentDate) return;

    const formattedDate = format(date, 'yyyy-MM-dd');
    onUpdatePaymentDate(paymentId, formattedDate);
    setEditingDateId(null);
  };

  return (
    <div className="border rounded-md overflow-hidden">
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
              <TableCell>{schedule.description}</TableCell>
              <TableCell>
                {new Date(schedule.dueDate).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                {schedule.percentage}%
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency((amount * schedule.percentage) / 100)}
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
    </div>
  );
});

PaymentScheduleTable.displayName = 'PaymentScheduleTable';

export default PaymentScheduleTable;
