import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getInvoiceByViewLink, getClient, updateInvoiceStatus, getInvoice } from '@/lib/storage';
import { Invoice, Client } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Calendar, FileText, DollarSign, Send, Camera, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const InvoiceView = () => {
  const { viewLink } = useParams<{ viewLink: string }>();
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();
  
  const isClientView = (location.search.includes('client=true') || !location.search) && !isAdmin;

  const generateDefaultEmailContent = () => {
    if (!client || !invoice) return "Dear Client,\r\n\r\nPlease find your invoice at the link below:\r\n[Invoice Link]\r\n\r\nThank you for your business.";
    
    const invoiceUrl = `${window.location.origin}/invoice/${viewLink}?client=true`;
    
    return `Dear ${client.name},\r\n\r\nPlease find your invoice (${invoice.number}) at the following link:\r\n${invoiceUrl}\r\n\r\nThank you for your business.`;
  };
  
  const generateDefaultSubject = () => {
    if (!client || !invoice) return "Invoice";
    return `Invoice ${invoice.number} for ${client.name}`;
  };
  
  const [emailContent, setEmailContent] = useState(generateDefaultEmailContent());
  const [emailSubject, setEmailSubject] = useState(generateDefaultSubject());

  useEffect(() => {
    if (!viewLink) {
      setError('Invoice link is missing.');
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        console.log('Attempting to fetch invoice with ID:', viewLink);
        
        const fetchedInvoice = await getInvoice(viewLink);
        
        if (!fetchedInvoice) {
          console.log('Invoice not found by ID, trying by view link');
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

  useEffect(() => {
    if (client && invoice) {
      setEmailContent(generateDefaultEmailContent());
      setEmailSubject(generateDefaultSubject());
    }
  }, [client, invoice]);

  const addToGoogleCalendar = () => {
    if (!invoice?.shootingDate || !client) return false;
    
    try {
      const formattedDate = format(new Date(invoice.shootingDate), 'yyyyMMdd');
      const title = `Photo Shoot - ${client.name} - Invoice #${invoice.number}`;
      const details = `Photo shooting session for ${client.name}.\n\nClient Contact:\nEmail: ${client.email}\nPhone: ${client.phone}\n\nAddress: ${client.address}\n\nInvoice #${invoice.number}`;
      
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

  const addToCompanyCalendar = async (invoiceId: string, clientId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('add-to-calendar', {
        body: { invoiceId, clientId }
      });
      
      if (error) {
        console.error('Error calling add-to-calendar function:', error);
        toast.error('Failed to add event to company calendar');
        return false;
      }
      
      if (data.success) {
        toast.success('Event added to company calendar');
        return true;
      } else {
        console.warn('Calendar function response:', data);
        toast.warning(data.message || 'Could not add to calendar');
        return false;
      }
    } catch (err) {
      console.error('Failed to add to company calendar:', err);
      toast.error('Failed to add event to company calendar');
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
        
        if (updatedInvoice.shootingDate && client) {
          const calendarSuccess = await addToCompanyCalendar(updatedInvoice.id, client.id);
          
          if (!calendarSuccess) {
            toast.warning('Using backup method to create calendar event');
            const manualSuccess = addToGoogleCalendar();
            if (manualSuccess) {
              toast.success('Please add this event to your company calendar');
            }
          }
        }
      } else {
        toast.error('Failed to update invoice status.');
      }
    } catch (err) {
      toast.error('Failed to accept invoice.');
    }
  };

  const handleSendEmail = async () => {
    if (!invoice || !client || !client.email) {
      toast.error('Client email is required');
      return;
    }
    
    setSending(true);
    try {
      console.log('Sending invoice email to:', client.email);
      const invoiceUrl = `${window.location.origin}/invoice/${viewLink}?client=true`;
      
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { 
          clientEmail: client.email,
          clientName: client.name,
          invoiceNumber: invoice.number,
          invoiceUrl: invoiceUrl,
          emailSubject: emailSubject,
          emailContent: emailContent
        }
      });
      
      if (error) {
        console.error('Error sending email:', error);
        toast.error('Email failed to send.');
        return;
      }
      
      if (data?.success) {
        console.log('Email response:', data);
        toast.success(`Email sent to ${client.email}`);
        
        if (invoice.status === 'draft') {
          const updatedInvoice = await updateInvoiceStatus(invoice.id, 'sent');
          if (updatedInvoice) {
            setInvoice(updatedInvoice);
          }
        }
      } else {
        console.warn('Email response:', data);
        toast.error(data?.message || 'Email failed to send.');
        
        if (data?.debug) {
          console.log('Email debug info:', data.debug);
        }
      }
    } catch (err) {
      console.error('Failed to send email:', err);
      toast.error('Failed to send email to client.');
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

  const canClientAccept = ['draft', 'sent'].includes(invoice.status);

  return (
    <PageTransition>
      <div className="container py-8">
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
          
          <CardFooter className="justify-end gap-2 flex-wrap">
            {!isClientView && (
              <>
                <div className="w-full flex flex-col gap-2 mb-4">
                  <Label htmlFor="emailSubject">Email Subject</Label>
                  <Input
                    id="emailSubject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={generateDefaultSubject()}
                  />
                  
                  <Label htmlFor="emailContent">Email Content</Label>
                  <Textarea
                    id="emailContent"
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder={generateDefaultEmailContent()}
                    className="min-h-[100px]"
                    rows={5}
                  />
                </div>
                
                <Button 
                  onClick={handleSendEmail} 
                  variant="default" 
                  disabled={sending || !client?.email}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                
                {invoice.status === 'sent' && (
                  <Button onClick={handleAcceptInvoice}>
                    <Check className="h-4 w-4 mr-2" />
                    Accept Invoice
                  </Button>
                )}
              </>
            )}
            
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
