
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoices } from '@/lib/storage';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, MoreHorizontal, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PageTransition from '@/components/ui-custom/PageTransition';
import { formatCurrency } from '@/lib/utils';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompanyContext } from '@/context/CompanyContext';

const Invoices = () => {
  const { selectedCompany } = useCompanyContext();
  const selectedCompanyId = selectedCompany?.id;
  const navigate = useNavigate();
  
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices', selectedCompanyId],
    queryFn: () => getInvoices(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const handleRowClick = (invoiceId: string) => {
    navigate(`/invoice/${invoiceId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'draft':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <h1 className="text-3xl font-bold mb-4 sm:mb-0">Invoices</h1>
          <Button asChild>
            <Link to="/client/new/invoice/create">
              <FileText className="mr-2 h-4 w-4" />
              <span>Create New Invoice</span>
            </Link>
          </Button>
        </div>
        
        <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading invoices...</div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">Failed to load invoices</div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Invoices Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  You haven't created any invoices yet. Create your first invoice to get started.
                </p>
                <Button asChild>
                  <Link to="/client/new/invoice/create">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Create Invoice</span>
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead className="hidden md:table-cell">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow 
                        key={invoice.id} 
                        className="cursor-pointer"
                        onClick={(e) => {
                          // Prevent row click if dropdown is being interacted with
                          if (!(e.target as HTMLElement).closest('.dropdown-actions')) {
                            handleRowClick(invoice.id);
                          }
                        }}
                      >
                        <TableCell className="font-medium">{invoice.invoiceNumber || '-'}</TableCell>
                        <TableCell>{invoice.clientName}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {invoice.date ? new Date(invoice.date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(invoice.totalAmount || 0, invoice.currency || 'USD')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="dropdown-actions" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/invoice/${invoice.id}`}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    <span>View</span>
                                  </Link>
                                </DropdownMenuItem>
                                {invoice.status === 'draft' && (
                                  <DropdownMenuItem asChild>
                                    <Link to={`/invoice/${invoice.id}/edit`}>
                                      <FileText className="mr-2 h-4 w-4" />
                                      <span>Edit</span>
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Invoices;
