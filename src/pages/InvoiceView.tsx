import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Invoice, InvoiceStatus, PaymentStatus, PaymentSchedule } from '@/types';
import { getInvoice, updateInvoiceStatus, updatePaymentScheduleStatus, updateContractStatus } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, Circle, Copy, File, Loader2, Mail, MessageSquare, Send, Share2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '@/components/CompanySelector';
import { useAuth } from '@/context/AuthContext';
import { generateInvoicePDF } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const InvoiceView = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompany();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<InvoiceStatus | null>(null);
  const [updatingPaymentSchedule, setUpdatingPaymentSchedule] = useState<string | null>(null);
  const [paymentDateDialogOpen, setPaymentDateDialogOpen] = useState(false);
  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (invoiceId) {
        setLoading(true);
        try {
          const fetchedInvoice = await getInvoice(invoiceId);
          if (fetchedInvoice) {
            setInvoice(fetchedInvoice);
          } else {
            toast.error('Invoice not found');
            navigate('/');
          }
        } catch (error) {
          console.error('Failed to fetch invoice:', error);
          toast.error('Failed to load invoice data');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchInvoice();
  }, [invoiceId, navigate]);

  const handleGeneratePdf = async () => {
    if (!invoice) return;

    setGeneratingPdf(true);
    try {
      const pdfUrl = await generateInvoicePDF(invoice.id);
      if (pdfUrl) {
        setInvoice(prev => prev ? { ...prev, pdfUrl } : null);
        toast.success('PDF generated successfully!');
      } else {
        toast.error('Failed to generate PDF.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const updateInvoiceStatusHandler = async (newStatus: InvoiceStatus) => {
    if (!invoice) return;

    setUpdatingStatus(newStatus);
    try {
      const success = await updateInvoiceStatus(invoice.id, newStatus);
      if (success) {
        setInvoice(prev => prev ? { ...prev, status: newStatus } : null);
        toast.success(`Invoice status updated to ${newStatus}`);
      } else {
        toast.error('Failed to update invoice status');
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const updateContractStatusHandler = async () => {
    if (!invoice) return;

    const newStatus = invoice.contractStatus === 'pending' ? 'accepted' : 'pending';

    try {
      const success = await updateContractStatus(invoice.id, newStatus);
      if (success) {
        setInvoice(prev => prev ? { ...prev, contractStatus: newStatus } : null);
        toast.success(`Contract status updated to ${newStatus}`);
      } else {
        toast.error('Failed to update contract status');
      }
    } catch (error) {
      console.error('Error updating contract status:', error);
      toast.error('Failed to update contract status');
    }
  };

  const copyInvoiceLink = () => {
    if (!invoice) return;
    navigator.clipboard.writeText(invoice.viewLink);
    toast.success('Invoice link copied to clipboard!');
  };

  const sendInvoiceLink = () => {
    if (!invoice) return;
    window.location.href = `mailto:?subject=Invoice Link&body=Here is the link to view your invoice: ${invoice.viewLink}`;
  };

  const updateScheduleStatus = async (scheduleId: string, status: PaymentStatus) => {
    if (!invoice) return;
    
    try {
      setUpdatingPaymentSchedule(scheduleId);
      
      let paymentDate: string | undefined;
      if (status === 'paid') {
        setPaymentDateDialogOpen(true);
        setCurrentScheduleId(scheduleId);
        return;  // Wait for dialog to close
      }
      
      const success = await updatePaymentScheduleStatus(scheduleId, status);
      if (success) {
        // Update local state
        setInvoice(prev => {
          if (!prev?.paymentSchedules) return prev;
          
          const updatedSchedules = prev.paymentSchedules.map(schedule => 
            schedule.id === scheduleId ? { ...schedule, status, paymentDate } : schedule
          );
          
          return {
            ...prev,
            paymentSchedules: updatedSchedules
          } as Invoice;
        });
        
        toast.success(`Payment status updated to ${status}`);
      } else {
        toast.error('Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment schedule status:', error);
      toast.error('Failed to update payment status');
    } finally {
      setUpdatingPaymentSchedule(null);
    }
  };

  const handlePaymentDateConfirm = async (date: Date) => {
    if (!currentScheduleId || !invoice) return;
    
    const formattedDate = format(date, 'yyyy-MM-dd');
    const success = await updatePaymentScheduleStatus(currentScheduleId, 'paid', formattedDate);
    
    if (success) {
      // Update local state
      setInvoice(prev => {
        if (!prev?.paymentSchedules) return prev;
        
        const updatedSchedules = prev.paymentSchedules.map(schedule => 
          schedule.id === currentScheduleId ? { ...schedule, status: 'paid' as PaymentStatus, paymentDate: formattedDate } : schedule
        );
        
        return {
          ...prev,
          paymentSchedules: updatedSchedules
        } as Invoice;
      });
      
      toast.success('Payment marked as paid');
    } else {
      toast.error('Failed to update payment status');
    }
    
    setPaymentDateDialogOpen(false);
    setUpdatingPaymentSchedule(null);
    setCurrentScheduleId(null);
  };

  if (loading) {
    return <div className="container py-8">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="container py-8">Invoice not found.</div>;
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild>
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
      <Card className="w-full max-w-4xl mx-auto mt-4">
        <CardHeader>
          <CardTitle>Invoice #{invoice.number}</CardTitle>
          <CardDescription>
            View and manage invoice details.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Client</div>
              <div>{invoice.clientId}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Date</div>
              <div>{format(new Date(invoice.date), 'PPP')}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Due Date</div>
              <div>{format(new Date(invoice.dueDate), 'PPP')}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Status</div>
              <div>
                <Badge variant="secondary">
                  {invoice.status}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Contract Status</div>
              <div>
                <Badge variant="secondary">
                  {invoice.contractStatus}
                </Badge>
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">Items</div>
            <ul>
              {invoice.items.map(item => (
                <li key={item.id} className="py-2">
                  {item.description} - ${item.amount}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium">Notes</div>
            <div>{invoice.notes}</div>
          </div>
          <div>
            <div className="text-sm font-medium">Contract Terms</div>
            <div>{invoice.contractTerms}</div>
          </div>
          <div>
            <div className="text-sm font-medium">Payment Schedules</div>
            <ul>
              {invoice.paymentSchedules?.map(schedule => (
                <li key={schedule.id} className="py-2">
                  {schedule.description} - Due: {format(new Date(schedule.dueDate), 'PPP')} - {schedule.status}
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => updateScheduleStatus(schedule.id, schedule.status === 'paid' ? 'unpaid' : 'paid')}
                    disabled={updatingPaymentSchedule === schedule.id}
                  >
                    {updatingPaymentSchedule === schedule.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : schedule.status === 'paid' ? (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Mark as Unpaid
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as Paid
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button onClick={copyInvoiceLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
            <Button onClick={sendInvoiceLink}>
              <Mail className="mr-2 h-4 w-4" />
              Send Link
            </Button>
            <Button onClick={handleGeneratePdf} disabled={generatingPdf}>
              {generatingPdf ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <File className="mr-2 h-4 w-4" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => updateInvoiceStatusHandler('sent')} disabled={updatingStatus !== null}>
              {updatingStatus === 'sent' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Mark as Sent
                </>
              )}
            </Button>
            <Button onClick={() => updateInvoiceStatusHandler('accepted')} disabled={updatingStatus !== null}>
              {updatingStatus === 'accepted' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Accepted
                </>
              )}
            </Button>
            <Button onClick={updateContractStatusHandler}>
              {invoice.contractStatus === 'pending' ? (
                <>
                  <Circle className="mr-2 h-4 w-4" />
                  Accept Contract
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Unaccept Contract
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={paymentDateDialogOpen} onOpenChange={setPaymentDateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Payment Date</DialogTitle>
            <DialogDescription>
              Select the date when the payment was received.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentDate" className="text-right">
                Payment Date
              </Label>
              <DatePicker
                id="paymentDate"
                mode="single"
                selected={paymentDate}
                onSelect={setPaymentDate}
                className="col-span-3"
              />
            </div>
          </div>
          <Button onClick={() => paymentDate && handlePaymentDateConfirm(paymentDate)}>Mark as Paid</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceView;
