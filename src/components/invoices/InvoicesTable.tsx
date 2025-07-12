
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, CalendarDays } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import AcceptanceStatusDots from './AcceptanceStatusDots';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SortConfig = {
  key: string;
  direction: 'asc' | 'desc' | null;
};

interface InvoicesTableProps {
  invoices: any[];
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  getClientName: (clientId: string) => string;
  getJobName: (jobId: string) => string;
  getJobDateDisplay: (invoice: any) => React.ReactNode;
  companyCurrency: string;
}

// Helper function to check if invoice is accepted (based on status or timestamp)
const isInvoiceAccepted = (invoice: any) => {
  return invoice.status === 'accepted' || invoice.status === 'paid' || !!invoice.invoice_accepted_at;
};

// Helper function to check if contract is accepted
const isContractAccepted = (invoice: any) => {
  return !!(invoice.contract_accepted_at || invoice.contract_accepted_by || (invoice.contractStatus === 'accepted'));
};

// Helper function to calculate paid amount from payment schedules
const getPaidAmount = (invoice: any) => {
  if (!invoice.paymentSchedules || !Array.isArray(invoice.paymentSchedules)) {
    return 0;
  }
  
  return invoice.paymentSchedules
    .filter(schedule => schedule.status === 'paid')
    .reduce((total, schedule) => total + (schedule.amount || 0), 0);
};

const InvoicesTable: React.FC<InvoicesTableProps> = ({
  invoices,
  sortConfig,
  onSort,
  getClientName,
  getJobName,
  getJobDateDisplay,
  companyCurrency,
}) => {
  const navigate = useNavigate();

  const handleRowClick = (invoiceId: string) => {
    navigate(`/invoice/${invoiceId}`);
  };

  const getSortIndicator = (columnKey: string) => {
    if (sortConfig.key === columnKey) {
      if (sortConfig.direction === 'asc') {
        return <ArrowUp className="inline-block ml-1 h-4 w-4" />;
      } else if (sortConfig.direction === 'desc') {
        return <ArrowDown className="inline-block ml-1 h-4 w-4" />;
      }
    }
    return null;
  };

  return (
    <div className="rounded-md border">
      <ScrollArea className="w-full">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer" 
                onClick={() => onSort('number')}
              >
                Invoice # {getSortIndicator('number')}
              </TableHead>
              <TableHead 
                className="cursor-pointer" 
                onClick={() => onSort('client')}
              >
                Client {getSortIndicator('client')}
              </TableHead>
              <TableHead 
                className="cursor-pointer" 
                onClick={() => onSort('job')}
              >
                Job {getSortIndicator('job')}
              </TableHead>
              <TableHead 
                className="cursor-pointer" 
                onClick={() => onSort('date')}
              >
                Invoice Date {getSortIndicator('date')}
              </TableHead>
              <TableHead 
                className="cursor-pointer" 
                onClick={() => onSort('shootingDate')}
              >
                Job Date {getSortIndicator('shootingDate')}
              </TableHead>
              <TableHead 
                className="cursor-pointer" 
                onClick={() => onSort('amount')}
              >
                Amount {getSortIndicator('amount')}
              </TableHead>
              <TableHead 
                className="cursor-pointer" 
                onClick={() => onSort('paid')}
              >
                Paid {getSortIndicator('paid')}
              </TableHead>
              <TableHead>
                Acceptance
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              console.log(`[InvoicesTable] Invoice ${invoice.id} acceptance check: status=${invoice.status}, invoice_accepted_at=${invoice.invoice_accepted_at}, isInvoiceAccepted=${isInvoiceAccepted(invoice)}`);
              console.log(`[InvoicesTable] Invoice ${invoice.id} contract check: contract_accepted_at=${invoice.contract_accepted_at}, contract_accepted_by=${invoice.contract_accepted_by}, contractStatus=${invoice.contractStatus}, isContractAccepted=${isContractAccepted(invoice)}`);
              const paidAmount = getPaidAmount(invoice);
              return (
                <TableRow 
                  key={invoice.id} 
                  className="cursor-pointer"
                  onClick={() => handleRowClick(invoice.id)}
                >
                  <TableCell className="font-medium">{invoice.number || '-'}</TableCell>
                  <TableCell>{getClientName(invoice.clientId)}</TableCell>
                  <TableCell>{getJobName(invoice.jobId)}</TableCell>
                  <TableCell>
                    {invoice.date ? new Date(invoice.date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      {getJobDateDisplay(invoice)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(invoice.amount || 0, companyCurrency)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(paidAmount, companyCurrency)}
                  </TableCell>
                  <TableCell>
                    <AcceptanceStatusDots 
                      isInvoiceAccepted={isInvoiceAccepted(invoice)}
                      isContractAccepted={isContractAccepted(invoice)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default InvoicesTable;
