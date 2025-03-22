
import React from 'react';
import { format } from 'date-fns';
import { Client, Invoice, Job, Company } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Phone, Mail, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceLayoutProps {
  invoice: Invoice;
  client: Client;
  job?: Job | null;
  company?: Company | null;
}

const InvoiceLayout: React.FC<InvoiceLayoutProps> = ({ invoice, client, job, company }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'border-gray-400 text-gray-600 bg-gray-100';
      case 'sent':
        return 'border-teal-400 text-teal-600 bg-teal-50';
      case 'accepted':
        return 'border-blue-400 text-blue-600 bg-blue-50';
      case 'paid':
        return 'border-green-400 text-green-600 bg-green-50';
      default:
        return 'border-gray-400 text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: company?.currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const statusColorClass = getStatusColor(invoice.status);
  const invoiceDate = invoice.date ? new Date(invoice.date) : new Date();
  const shootingDate = invoice.shootingDate ? new Date(invoice.shootingDate) : null;

  return (
    <Card className="w-full max-w-5xl mx-auto shadow-md">
      <CardContent className="p-8">
        <div className="flex flex-col space-y-6">
          {/* Header with logo and status */}
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {company?.logo_url ? (
                <img 
                  src={company.logo_url} 
                  alt={`${company.name} logo`} 
                  className="max-h-32 max-w-xs object-contain" 
                />
              ) : (
                <h1 className="text-4xl sm:text-5xl font-light text-gray-500">
                  {company?.name || 'Company Name'}
                </h1>
              )}
            </div>
            
            <div className="flex-1 flex justify-end">
              <div className={cn(
                "rounded-full border-4 p-8 w-32 h-32 flex items-center justify-center",
                statusColorClass
              )}>
                <span className="text-2xl font-semibold capitalize">
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice details section */}
          <div className="grid grid-cols-2 gap-12 mt-8">
            <div className="space-y-2">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-gray-500 font-medium">Invoice ID</span>
                <span className="font-medium">{invoice.number}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-gray-500 font-medium">Issue Date</span>
                <span>{format(invoiceDate, "dd MMMM yyyy")}</span>
              </div>
            </div>

            <div>
              <div className="mb-2">
                <span className="text-gray-500 font-medium">From</span>
              </div>
              <div className="space-y-1">
                <div className="font-medium">{company?.name}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{company?.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{company?.email || 'No email'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Client and Job details */}
          <div className="grid grid-cols-2 gap-12 mt-4">
            <div></div>
            <div>
              <div className="mb-2">
                <span className="text-gray-500 font-medium">Invoice for</span>
              </div>
              <div className="space-y-1">
                <div className="font-medium">
                  {job?.title || 'No job title'}
                </div>
                {shootingDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{format(shootingDate, "dd MMM yyyy")}</span>
                  </div>
                )}
                <div className="mt-4 font-medium">{client.name}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{client.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice items table */}
          <div className="mt-12">
            <h2 className="text-xl font-medium mb-4">Invoice</h2>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-1/4">Product / Package</TableHead>
                    <TableHead className="w-2/5">Description</TableHead>
                    <TableHead className="w-1/6 text-right">Unit Price</TableHead>
                    <TableHead className="w-1/12 text-right">Quantity</TableHead>
                    <TableHead className="w-1/6 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description.split('\n')[0]}</TableCell>
                      <TableCell>
                        <div dangerouslySetInnerHTML={{ __html: item.description }} />
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Invoice total */}
          <div className="flex justify-end mt-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between py-2 border-t">
                <span className="font-medium">Total</span>
                <span className="font-bold">{formatCurrency(invoice.amount)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {(invoice.notes || invoice.contractTerms) && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {invoice.notes && (
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5" />
                    Notes
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-md border">
                    <div dangerouslySetInnerHTML={{ __html: invoice.notes }} />
                  </div>
                </div>
              )}
              
              {invoice.contractTerms && (
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5" />
                    Terms & Conditions
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-md border">
                    <div dangerouslySetInnerHTML={{ __html: invoice.contractTerms }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceLayout;
