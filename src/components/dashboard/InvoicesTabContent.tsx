
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Invoice, Client } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FilePlus, Eye, CalendarDays, Check, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface InvoicesTabContentProps {
  invoices: Invoice[];
  clients: Client[];
  jobs: any[];
  jobDates: Record<string, string>;
  getStatusColor: (status: string) => string;
  getJobDateDisplay: (invoice: any) => React.ReactNode;
  onOpenCreateInvoiceModal: () => void;
}

const InvoicesTabContent: React.FC<InvoicesTabContentProps> = ({ 
  invoices, 
  clients, 
  jobs, 
  jobDates,
  getStatusColor, 
  getJobDateDisplay,
  onOpenCreateInvoiceModal
}) => {
  const navigate = useNavigate();
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const isMobile = useIsMobile();

  const filteredInvoices = [...invoices].filter(invoice => 
    invoice.number.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) || 
    clients.find(c => c.id === invoice.clientId)?.name.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
    invoice.status.toLowerCase().includes(invoiceSearchQuery.toLowerCase())
  );

  const handleInvoiceRowClick = (invoiceId: string) => {
    navigate(`/invoice/${invoiceId}`);
  };

  const getAcceptanceBadge = (accepted: boolean, acceptedAt?: string) => {
    if (accepted && acceptedAt) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Check className="w-3 h-3 mr-1" />
          Accepted
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
        <X className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  return (
    <>
      <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex justify-between items-center'} mb-4`}>
        <h2 className={`text-xl font-semibold ${isMobile ? 'mb-1' : ''}`}>Your Invoices</h2>
        {jobs.length > 0 && (
          <div className={isMobile ? 'w-full' : ''}>
            <Button 
              size={isMobile ? "mobile" : "sm"} 
              onClick={onOpenCreateInvoiceModal}
              className={isMobile ? "w-full touch-manipulation" : ""}
            >
              <FilePlus className="h-4 w-4 mr-2" />
              Add Invoice
            </Button>
          </div>
        )}
      </div>
      
      <div className="relative mb-4">
        <Input 
          placeholder="Search invoices by number, client name, or status..." 
          value={invoiceSearchQuery} 
          onChange={e => setInvoiceSearchQuery(e.target.value)} 
          className="pr-10" 
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      </div>
      
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FilePlus className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Invoices Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            You haven't created any invoices yet. Select a job to create your first invoice.
          </p>
          {jobs.length > 0 && 
            <Button asChild>
              <Link to={`/job/${jobs[0].id}`}>
                Select a Job
              </Link>
            </Button>
          }
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No invoices match your search</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Invoice Date</TableHead>
                <TableHead className="hidden md:table-cell">Job Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Invoice</TableHead>
                <TableHead className="hidden lg:table-cell">Contract</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map(invoice => {
                const invoiceClient = clients.find(c => c.id === invoice.clientId) || null;
                return (
                  <TableRow key={invoice.id} onClick={() => handleInvoiceRowClick(invoice.id)} className="cursor-pointer">
                    <TableCell className="font-medium">{invoice.number}</TableCell>
                    <TableCell>{invoiceClient?.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(invoice.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center">
                        <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        {getJobDateDisplay(invoice)}
                      </div>
                    </TableCell>
                    <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {getAcceptanceBadge(invoice.status === 'accepted' || invoice.status === 'paid', invoice.contract_accepted_at)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {getAcceptanceBadge(invoice.contractStatus === 'accepted', invoice.contract_accepted_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <Button variant="outline" size={isMobile ? "mobile" : "sm"} asChild className={isMobile ? "touch-manipulation" : ""}>
                          <Link to={`/invoice/${invoice.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
};

export default InvoicesTabContent;
