import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getInvoiceByViewLink, getClient, updateInvoiceStatus } from '@/lib/storage';
import { Invoice, Client } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Calendar, FileText, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';

const InvoiceView = () => {
  const { viewLink } = useParams<{ viewLink: string }>();
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewLink) {
      setError('Invoice link is missing.');
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        const fetchedInvoice = getInvoiceByViewLink(viewLink);
        if (!fetchedInvoice) {
          setError('Invoice not found.');
          setLoading(false);
          return;
        }

        setInvoice(fetchedInvoice);

        const fetchedClient = getClient(fetchedInvoice.clientId);
        if (!fetchedClient) {
          setError('Client not found.');
          setLoading(false);
          return;
        }

        setClient(fetchedClient);
        setLoading(false);
      } catch (err) {
        setError('Failed to load invoice.');
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [viewLink]);

  const handleAcceptInvoice = async () => {
    if (!invoice) return;

    try {
      const updatedInvoice = updateInvoiceStatus(invoice.id, 'accepted');
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        toast.success('Invoice accepted!');
      } else {
        toast.error('Failed to update invoice status.');
      }
    } catch (err) {
      toast.error('Failed to accept invoice.');
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          Loading invoice...
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          Error: {error}
        </div>
      </PageTransition>
    );
  }

  if (!invoice || !client) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          Invoice or client not found.
        </div>
      </PageTransition>
    );
  }

  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    paid: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };

  return (
    <PageTransition>
      <div className="container py-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              <span>Invoice: {invoice.number}</span>
              <Badge className={statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}>
                {invoice.status.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              View invoice details and contract terms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-semibold mb-2">Client Information</h4>
                <p>
                  <strong>Name:</strong> {client.name}
                </p>
                <p>
                  <strong>Email:</strong> {client.email}
                </p>
                <p>
                  <strong>Phone:</strong> {client.phone}
                </p>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">Invoice Details</h4>
                <p>
                  <strong>Date:</strong> {new Date(invoice.date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}
                </p>
                <p>
                  <strong>Amount:</strong> ${invoice.amount.toFixed(2)}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-lg font-semibold mb-2">Items</h4>
              <ul className="list-disc pl-5">
                {invoice.items.map((item) => (
                  <li key={item.id} className="mb-2">
                    {item.description} - {item.quantity} x ${item.rate.toFixed(2)} = ${item.amount.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div>
              <h4 className="text-lg font-semibold mb-2">Notes</h4>
              <p>{invoice.notes || 'No notes provided.'}</p>
            </div>

            <Separator />

            <div>
              <h4 className="text-lg font-semibold mb-2 flex items-center gap-1">
                <FileText className="h-4 w-4 mr-1" />
                Contract Terms
              </h4>
              <p className="whitespace-pre-line">{invoice.contractTerms}</p>
            </div>
          </CardContent>
          
          {invoice.status === 'sent' && (
            <CardFooter className="justify-end">
              <Button onClick={handleAcceptInvoice}>
                <Check className="h-4 w-4 mr-2" />
                Accept Invoice
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </PageTransition>
  );
};

export default InvoiceView;
