
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, CalendarDays } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import StatusBadge from './StatusBadge';
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
      <Table>
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
              className="hidden md:table-cell cursor-pointer" 
              onClick={() => onSort('job')}
            >
              Job {getSortIndicator('job')}
            </TableHead>
            <TableHead 
              className="hidden md:table-cell cursor-pointer" 
              onClick={() => onSort('date')}
            >
              Invoice Date {getSortIndicator('date')}
            </TableHead>
            <TableHead 
              className="hidden md:table-cell cursor-pointer" 
              onClick={() => onSort('shootingDate')}
            >
              Job Date {getSortIndicator('shootingDate')}
            </TableHead>
            <TableHead 
              className="hidden md:table-cell cursor-pointer" 
              onClick={() => onSort('amount')}
            >
              Amount {getSortIndicator('amount')}
            </TableHead>
            <TableHead 
              className="cursor-pointer" 
              onClick={() => onSort('status')}
            >
              Status {getSortIndicator('status')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow 
              key={invoice.id} 
              className="cursor-pointer"
              onClick={() => handleRowClick(invoice.id)}
            >
              <TableCell className="font-medium">{invoice.number || '-'}</TableCell>
              <TableCell>{getClientName(invoice.clientId)}</TableCell>
              <TableCell className="hidden md:table-cell">{getJobName(invoice.jobId)}</TableCell>
              <TableCell className="hidden md:table-cell">
                {invoice.date ? new Date(invoice.date).toLocaleDateString() : '-'}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  {getJobDateDisplay(invoice)}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {formatCurrency(invoice.amount || 0, companyCurrency)}
              </TableCell>
              <TableCell>
                <StatusBadge status={invoice.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default InvoicesTable;
