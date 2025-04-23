
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getInvoice, getClient, getJob, updateInvoice } from '@/lib/storage';
import { Invoice, Client, Job, ContractStatus, InvoiceStatus, PaymentSchedule, PaymentStatus } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Check, Download, Edit, Loader2, Mail, Save, ArrowUpRight, CircleDollarSign, X, Copy, Calendar, Share2, CalendarPlus, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import ContractAcceptance from '@/components/invoice/ContractAcceptance';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentScheduleTable from '@/components/invoice/PaymentScheduleTable';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy as CopyIcon } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AddToCalendarDialog } from '@/components/AddToCalendarDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useCompanyContext } from '@/context/CompanyContext';

const InvoiceView: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isContractAccepted, setIsContractAccepted] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [isAddToCalendarDialogOpen, setIsAddToCalendarDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  const { selectedCompany } = useCompanyContext();
  const currency = selectedCompany?.currency || 'USD';

  useEffect(() => {
    const fetchInvoice = async () => {
      setIsLoading(true);
      try {
        if (!invoiceId) {
          console.error("No invoice ID provided");
          uiToast({
            variant: "destructive",
            title: "Error",
            description: "No invoice ID provided.",
          });
          return;
        }
        
        const invoiceData = await getInvoice(invoiceId);
        if (!invoiceData) {
          console.error(`Invoice with ID ${invoiceId} not found`);
          uiToast({
            variant: "destructive",
            title: "Error",
            description: `Invoice with ID ${invoiceId} not found.`,
          });
          return;
        }
        setInvoice(invoiceData);
        
        const clientData = await getClient(invoiceData.clientId);
        setClient(clientData);
        
        const jobData = await getJob(invoiceData.jobId);
        setJob(jobData);
        
        setIsContractAccepted(invoiceData.contractStatus === 'accepted');
      } catch (error) {
        console.error("Failed to fetch invoice:", error);
        uiToast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load invoice details.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvoice();
  }, [invoiceId, uiToast]);

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice) return;
    setIsSaving(true);
    try {
      const updatedInvoice = { ...invoice, status: newStatus };
      await updateInvoice(updatedInvoice);
      setInvoice(updatedInvoice);
      uiToast({
        title: "Success",
        description: "Invoice status updated successfully.",
      });
    } catch (error) {
      console.error("Failed to update invoice status:", error);
      uiToast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update invoice status.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleContractAcceptance = async (accepted: boolean) => {
    if (!invoice) return;
    setIsSaving(true);
    try {
      const newContractStatus = accepted ? 'accepted' : 'pending' as ContractStatus;
      const updatedInvoice = { ...invoice, contractStatus: newContractStatus };
      await updateInvoice(updatedInvoice);
      setInvoice(updatedInvoice);
      setIsContractAccepted(accepted);
      uiToast({
        title: "Success",
        description: "Contract acceptance status updated.",
      });
    } catch (error) {
      console.error("Failed to update contract acceptance:", error);
      uiToast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update contract acceptance.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!invoiceId) return;
    setIsPdfLoading(true);
    try {
      // Since generatePdf is not available, we'll use a different approach for now
      // This is a placeholder - in a real implementation, you would need to implement the PDF generation
      toast.success("PDF generation is not yet implemented", {
        duration: 3000,
      });
      
      uiToast({
        title: "Information",
        description: "PDF generation is not implemented yet.",
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF", {
        duration: 3000,
      });
      
      uiToast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate PDF.",
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: string, status: PaymentStatus) => {
    if (!invoice) return;
    setUpdatingPaymentId(paymentId);
    try {
      const updatedSchedules = invoice.paymentSchedules?.map(schedule => {
        if (schedule.id === paymentId) {
          return { ...schedule, status };
        }
        return schedule;
      }) || [];
      
      const updatedInvoice = { ...invoice, paymentSchedules: updatedSchedules };
      await updateInvoice(updatedInvoice);
      setInvoice(updatedInvoice);
      toast.success('Payment status updated successfully', {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status', {
        duration: 3000,
      });
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleShareLink = async () => {
    if (!invoice) return;
    setIsShareDialogOpen(true);
    
    const baseUrl = window.location.origin;
    const invoiceViewLink = `${baseUrl}/invoice/view/${invoice.viewLink}`;
    setShareLink(invoiceViewLink);
  };

  const handleCopyToClipboard = async () => {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copied to clipboard!', {
        duration: 3000,
      });
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy link to clipboard', {
        duration: 3000,
      });
    } finally {
      setIsCopying(false);
    }
  };

  // Add a currency-aware formatter
  const formatInvoiceCurrency = (amount: number) => {
    return formatCurrency(amount, currency);
  };

  // Only update the sections with currency formatting
  return (
    <div className="container mx-auto py-6 space-y-8">
      {isLoading && (
        <div className="flex items-center justify-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading invoice...
        </div>
      )}
      
      {!isLoading && !invoice && (
        <Alert variant="destructive">
          <AlertDescription>
            Invoice not found.
          </AlertDescription>
        </Alert>
      )}
      
      {invoice && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{invoice.number}</h1>
              <p className="text-muted-foreground">
                Created on {format(new Date(invoice.date), 'PPP')}
              </p>
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={handleShareLink}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" onClick={() => navigate(`/invoice/edit/${invoiceId}`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" onClick={handleGeneratePdf} disabled={isPdfLoading}>
                {isPdfLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
          
          {/* Invoice details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
                <CardDescription>
                  View and manage invoice details.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium leading-none mb-2">Client Information</h4>
                    <p className="text-sm text-muted-foreground">
                      {client?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {client?.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {client?.phone}
                    </p>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                {/* Invoice Items */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Invoice Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Item</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice?.items?.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.name}
                            </TableCell>
                            <TableCell>
                              <div 
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: item.description }}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {formatInvoiceCurrency(item.rate)}
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatInvoiceCurrency(item.quantity * item.rate)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Total */}
                    <div className="bg-muted/20 p-4 border-t">
                      <div className="flex justify-end">
                        <div className="w-1/3 space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-medium">{formatInvoiceCurrency(invoice?.amount || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span className="font-bold">{formatInvoiceCurrency(invoice?.amount || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Notes */}
                {invoice.notes && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2">Notes</h3>
                    <p className="text-muted-foreground">{invoice.notes}</p>
                  </div>
                )}
                
                {/* Payment Schedule */}
                {invoice?.paymentSchedules && invoice.paymentSchedules.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">Payment Schedule</h3>
                    <PaymentScheduleTable 
                      paymentSchedules={invoice.paymentSchedules}
                      amount={invoice.amount}
                      isClientView={true}
                      updatingPaymentId={updatingPaymentId}
                      onUpdateStatus={handleUpdatePaymentStatus}
                      formatCurrency={formatInvoiceCurrency}
                    />
                  </div>
                )}
                
                {/* Terms & Conditions */}
                {invoice.contractTerms && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2">Terms & Conditions</h3>
                    <div dangerouslySetInnerHTML={{ __html: invoice.contractTerms }} />
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>
                  Manage invoice status and contract acceptance.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium leading-none mb-2">Status</h4>
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">{invoice.status}</Badge>
                      <Button variant="outline" size="sm" onClick={() => setIsAddToCalendarDialogOpen(true)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Add to Calendar
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium leading-none mb-2">Contract</h4>
                    {isContractAccepted ? (
                      <Badge variant="outline">Accepted</Badge>
                    ) : (
                      <ContractAcceptance
                        companyName={selectedCompany?.name || "Our Company"}
                        onAccept={async () => await handleContractAcceptance(true)}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <AddToCalendarDialog
            isOpen={isAddToCalendarDialogOpen}
            onClose={() => setIsAddToCalendarDialogOpen(false)}
            invoice={invoice}
            client={client}
          />
          
          <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Share Invoice</DialogTitle>
                <DialogDescription>
                  Share this invoice with your client.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="link" className="text-right">
                    Link
                  </Label>
                  <Input type="text" id="link" value={shareLink} readOnly className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsShareDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleCopyToClipboard} disabled={isCopying}>
                  {isCopying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Copying...
                    </>
                  ) : (
                    <>
                      <CopyIcon className="mr-2 h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default InvoiceView;
