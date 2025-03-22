
import React, { memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { PaymentSchedule } from '@/types';

interface PaymentScheduleTableProps {
  paymentSchedules: PaymentSchedule[];
  amount: number;
  isClientView: boolean;
  updatingPaymentId: string | null;
  onUpdateStatus: (paymentId: string, status: 'paid' | 'unpaid' | 'write-off') => void;
  formatCurrency: (amount: number) => string;
}

const PaymentScheduleTable = memo(({
  paymentSchedules,
  amount,
  isClientView,
  updatingPaymentId,
  onUpdateStatus,
  formatCurrency
}: PaymentScheduleTableProps) => {
  const paymentStatusColors: { [key: string]: string } = {
    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    unpaid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'write-off': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
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
                {schedule.paymentDate && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Paid on: {format(new Date(schedule.paymentDate), 'MMM d, yyyy')}
                  </div>
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
                      <DropdownMenuItem 
                        onClick={() => onUpdateStatus(schedule.id, 'paid')}
                        className="text-green-600"
                      >
                        Mark as Paid
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onUpdateStatus(schedule.id, 'unpaid')}
                      >
                        Mark as Unpaid
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onUpdateStatus(schedule.id, 'write-off')}
                        className="text-red-600"
                      >
                        Write Off
                      </DropdownMenuItem>
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
