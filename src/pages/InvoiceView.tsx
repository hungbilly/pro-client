import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getInvoiceByViewLink, getClient, updateInvoiceStatus, getInvoice } from '@/lib/storage';
import { Invoice, Client } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Calendar, FileText, DollarSign, Send, Camera } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

const InvoiceView = () => {
  const { viewLink } = useParams<{ viewLink: string }>();
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();
  
  // Check if the URL has a client parameter or is accessed directly via shared link
  // But now allow admin to see the admin view even with client=true in URL
  const isClientView = (location.search.includes('client=true') || !location.search) && !isAdmin;

  useEffect(() => {
    if (!viewLink) {
      setError('Invoice link is missing.');
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        console.log('Attempting to fetch invoice with ID:', viewLink);
        
        // First try to fetch directly by ID since the URL contains the invoice ID
        const fetchedInvoice = await getInvoice(viewLink);
        
        if (!fetchedInvoice) {
          console.log('Invoice not found by ID, trying by view link');
          // If direct ID fetch fails, try by view link as before
          const fullViewLink = `${window.location.origin}/invoice/${viewLink}`;
          console.log('Trying with view link:', fullViewLink);
          
          const invoiceByViewLink = await getInvoiceByViewLink(fullViewLink);
          if (!invoiceByViewLink) {
            setError('Invoice not found.');
            setLoading(false);
            return;
          }
          
          setInvoice(invoiceByViewLink);
        } else {
          setInvoice(fetchedInvoice);
        }

        // Once we have the invoice, fetch the client
        if (fetchedInvoice || invoice) {
          const clientId = (fetchedInvoice || invoice)?.clientId;
          if (clientId) {
            const fetchedClient = await getClient(clientId);
            if (!fetchedClient) {
              setError('Client not found.');
              setLoading(false);
              return;
            }
            
            setClient(fetchedClient);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load invoice:', err);
        setError('Failed to load invoice.');
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [viewLink]);

  const addToGoogleCalendar = () => {
    if (!invoice?.shootingDate || !client) return false;
    
    try {
      const formattedDate = format(new Date(invoice.shootingDate), 'yyyyMMdd');
      const title = `Photo Shoot - ${client.name} - Invoice #${invoice.number}`;
      const details = `Photo shooting session for ${client.name}.\n\nClient Contact:\nEmail: ${client.email}\nPhone: ${client.phone}\n\nAddress: ${client.address}\n\nInvoice #${invoice.number}`;
      
      // Format time for all-day event (no specific time)
      const dateStart = formattedDate;
      const dateEnd = formattedDate;
      
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dateStart}/${dateEnd}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(client.address)}`;
      
      window.open(googleCalendarUrl, '_blank');
      return true;
    } catch (err) {
      console.error('Failed to add to Google Calendar:', err);
      return false;
    }
  };

  const handleAcceptInvoice = async () => {
    if (!invoice) return;

    try {
      const updatedInvoice = await updateInvoiceStatus(invoice.id, 'accepted');
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        toast.success('Invoice accepted!');
        
        // Automatically add to Google Calendar if the invoice has a shooting date
        if (updatedInvoice.shootingDate && client) {
          const calendarSuccess = addToGoogleCalendar();
          if (calendarSuccess) {
            toast.success('Event added to Google Calendar!');
          } else {
            toast.error('Failed to add event to Google Calendar. Please try manually.');
          }
        }
      } else {
        toast.error('Failed to update invoice status.');
      }
    } catch (err) {
      toast.error('Failed to accept invoice.');
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice || !client || !client.email) return;
    
    setSending(true);
    try {
      // Construct the full invoice URL with client parameter
      const invoiceUrl = `${window.location.origin}/invoice/${viewLink}?client=true`;
      
      // Use the browser's native mailto functionality
      const subject = encodeURIComponent(`Invoice ${invoice.number}`);
      const body = encodeURIComponent(
        `Dear ${client.name},\n\nPlease find your invoice (${invoice.number}) at the following link:\n${invoiceUrl}\n\nThank you for your business.`
      );
      
      window.location.href = `mailto:${client.email}?subject=${subject}&body=${body}`;
      
      toast.success(`Email client opened with invoice link for ${client.email}`);
    } catch (err) {
      console.error('Failed to open email client:', err);
      toast.error('Failed to open email client.');
    } finally {
      setSending(false);
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

  // Define which statuses allow clients to accept the invoice
  const canClientAccept = ['draft', 'sent'].includes(invoice.status);

  return (
    <PageTransition>
      <div className="container py-8">
        {/* Show back to dashboard button for admin users */}
        {!isClientView && (
          <Button asChild variant="ghost" className="mb-4">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        )}
        
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
                {invoice.shootingDate && (
                  <p className="flex items-center">
                    <strong className="mr-1">Shooting Date:</strong>
                    <Camera className="h-4 w-4 mr-1" />
                    {new Date(invoice.shootingDate).toLocaleDateString()}
                  </p>
                )}
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
          
          <CardFooter className="justify-end gap-2">
            {/* Only show admin buttons if not a client view */}
            {!isClientView && (
              <>
                <Button 
                  onClick={handleSendInvoice} 
                  variant="outline" 
                  disabled={sending || !client.email}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Email to Client
                </Button>
                
                {invoice.status === 'sent' && (
                  <Button onClick={handleAcceptInvoice}>
                    <Check className="h-4 w-4 mr-2" />
                    Accept Invoice
                  </Button>
                )}
              </>
            )}
            
            {/* Always show accept button for clients if invoice is in 'draft' or 'sent' status */}
            {isClientView && canClientAccept && (
              <Button onClick={handleAcceptInvoice}>
                <Check className="h-4 w-4 mr-2" />
                Accept Invoice
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
};

export default InvoiceView;
