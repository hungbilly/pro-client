
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoice, getClient, updateInvoiceStatus, getInvoiceByViewLink } from '@/lib/storage';
import { Invoice, Client } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import AnimatedBackground from '@/components/ui-custom/AnimatedBackground';
import { CalendarDays, ChevronLeft, CheckCircle, ClipboardCheck, FileEdit, DownloadCloud, ArrowLeft } from 'lucide-react';

const InvoiceView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isPublicView, setIsPublicView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    // Check if the ID is a viewLink (starts with http)
    const isViewLink = id.startsWith('http');
    
    let fetchedInvoice: Invoice | undefined;
    
    if (isViewLink) {
      // Public link view
      setIsPublicView(true);
      fetchedInvoice = getInvoiceByViewLink(window.location.href);
    } else {
      // Admin view
      fetchedInvoice = getInvoice(id);
    }

    if (fetchedInvoice) {
      setInvoice(fetchedInvoice);
      const fetchedClient = getClient(fetchedInvoice.clientId);
      if (fetchedClient) {
        setClient(fetchedClient);
      }
    } else {
      toast.error('Invoice not found');
      navigate('/');
    }
    
    setLoading(false);
  }, [id, navigate]);

  const handleAcceptInvoice = () => {
    if (!invoice) return;
    
    setIsAccepting(true);
    
    try {
      const updatedInvoice = updateInvoiceStatus(invoice.id, 'accepted');
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        toast.success('Invoice and contract terms accepted!');
      }
    } catch (error) {
      console.error('Error accepting invoice:', error);
      toast.error('Failed to accept invoice');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleMarkAsPaid = () => {
    if (!invoice) return;
    
    try {
      const updatedInvoice = updateInvoiceStatus(invoice.id, 'paid');
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        toast.success('Invoice marked as paid!');
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  const copyInvoiceLink = () => {
    if (!invoice) return;
    
    navigator.clipboard.writeText(invoice.viewLink)
      .then(() => toast.success('Invoice link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link'));
  };

  const printInvoice = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading invoice...</p>
      </div>
    );
  }

  if (!invoice || !client) {
    return null;
  }

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Accepted</Badge>;
      case 'paid':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Paid</Badge>;
      default:
        return null;
    }
  };

  return (
    <PageTransition>
      <AnimatedBackground>
        <div className="container px-4 py-8 mx-auto max-w-4xl print:pt-0">
          {!isPublicView && (
            <Button 
              variant="ghost" 
              className="mb-6 print:hidden" 
              onClick={() => navigate(invoice.status === 'draft' ? '/' : `/client/${client.id}`)}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              {invoice.status === 'draft' ? 'Back to Dashboard' : 'Back to Client'}
            </Button>
          )}

          <Card className="backdrop-blur-sm bg-white/90 border-transparent shadow-soft print:shadow-none print:border-0">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">Invoice {invoice.number}</CardTitle>
                  {getStatusBadge(invoice.status)}
                </div>
                <CardDescription className="mt-2">
                  Created on {new Date(invoice.date).toLocaleDateString()}
                </CardDescription>
              </div>
              
              {!isPublicView && invoice.status !== 'draft' && (
                <div className="flex gap-2 print:hidden">
                  <Button variant="outline" size="sm" onClick={copyInvoiceLink}>
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button variant="outline" size="sm" onClick={printInvoice}>
                    <DownloadCloud className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">From</h3>
                  <h4 className="font-bold text-lg">Your Wedding Business</h4>
                  <p className="text-sm">123 Wedding Lane</p>
                  <p className="text-sm">Wedding City, WC 12345</p>
                  <p className="text-sm">contact@weddingbusiness.com</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Bill To</h3>
                  <h4 className="font-bold text-lg">{client.name}</h4>
                  {client.address && <p className="text-sm">{client.address}</p>}
                  <p className="text-sm">{client.email}</p>
                  {client.phone && <p className="text-sm">{client.phone}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Invoice Number</h3>
                  <p>{invoice.number}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Invoice Date</h3>
                  <p className="flex items-center">
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    {new Date(invoice.date).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Due Date</h3>
                  <p className="flex items-center">
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-base font-medium mb-3">Invoice Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="py-2.5 px-4 text-left font-medium text-muted-foreground text-sm">Description</th>
                        <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-sm">Quantity</th>
                        <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-sm">Rate</th>
                        <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-sm">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr 
                          key={item.id} 
                          className={`border-b border-border/50 ${index % 2 === 1 ? 'bg-muted/20' : ''}`}
                        >
                          <td className="py-3 px-4">{item.description}</td>
                          <td className="py-3 px-4 text-right">{item.quantity}</td>
                          <td className="py-3 px-4 text-right">${item.rate.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right">${item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border">
                        <td colSpan={3} className="py-3 px-4 text-right font-medium">Total:</td>
                        <td className="py-3 px-4 text-right font-bold">${invoice.amount.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              {invoice.notes && (
                <div>
                  <h3 className="text-base font-medium mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
              
              <Separator />
              
              <div>
                <h3 className="text-base font-medium mb-3">Contract Terms</h3>
                <Card className="border bg-muted/20">
                  <CardContent className="p-4 text-sm whitespace-pre-line">
                    {invoice.contractTerms}
                  </CardContent>
                </Card>
              </div>
              
              {isPublicView && invoice.status === 'sent' && (
                <div className="bg-muted/20 p-4 rounded-md border border-border/50">
                  <h3 className="font-medium text-center mb-2">Accept Contract Terms</h3>
                  <p className="text-sm text-center text-muted-foreground mb-4">
                    By clicking the button below, you agree to the terms and conditions outlined in this contract.
                  </p>
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleAcceptInvoice}
                      disabled={isAccepting}
                      className="w-full max-w-xs"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isAccepting ? 'Processing...' : 'Accept Contract & Invoice'}
                    </Button>
                  </div>
                </div>
              )}
              
              {isPublicView && invoice.status === 'accepted' && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-800">
                  <h3 className="font-medium text-center text-green-800 dark:text-green-200 mb-1">Contract Accepted</h3>
                  <p className="text-sm text-center text-green-600 dark:text-green-300">
                    Thank you! You have accepted this contract and invoice.
                  </p>
                </div>
              )}
            </CardContent>
            
            {!isPublicView && (
              <CardFooter className="flex flex-wrap justify-between gap-3 print:hidden">
                <div className="flex gap-2">
                  {invoice.status === 'draft' && (
                    <Button 
                      variant="outline" 
                      asChild
                    >
                      <a href={`/invoice/edit/${invoice.id}`}>
                        <FileEdit className="h-4 w-4 mr-2" />
                        Edit Invoice
                      </a>
                    </Button>
                  )}
                  
                  {(invoice.status === 'sent' || invoice.status === 'accepted') && (
                    <Button 
                      variant="outline"
                      onClick={handleMarkAsPaid}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </Button>
                  )}
                </div>
                
                {invoice.status !== 'draft' && (
                  <Button 
                    variant="outline"
                    asChild
                  >
                    <a href={invoice.viewLink} target="_blank" rel="noreferrer">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      View Client Link
                    </a>
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        </div>
      </AnimatedBackground>
    </PageTransition>
  );
};

export default InvoiceView;
