import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Plus, Trash2, FileText, ArrowLeft, Package, Percent, Save, Eye, Send, Copy, Share2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Client, Invoice, InvoiceItem, Job, PaymentSchedule, ContractStatus, InvoiceStatus, PaymentStatus } from '@/types';
import { getClient, getClients, saveInvoice, updateInvoice, getJob, getClientJobs } from '@/lib/storage';
import { toast } from 'sonner';
import { useCompanyContext } from '@/context/CompanyContext';
import { useAuth } from '@/context/AuthContext';
import { DatePicker } from '@/components/ui/date-picker';
import RichTextEditor from '@/components/RichTextEditor';
import SaveAsTemplateDialog from '@/components/SaveAsTemplateDialog';
import InvoiceTemplateSettings from '@/components/InvoiceTemplateSettings';
import ContractTemplateSettings from '@/components/ContractTemplateSettings';
import PackageSelector from '@/components/PackageSelector';
import DiscountSelector from '@/components/DiscountSelector';
import PageTransition from '@/components/ui-custom/PageTransition';
import InvoiceShareDialog from '@/components/invoice/InvoiceShareDialog';
import DeleteInvoiceDialog from '@/components/invoices/DeleteInvoiceDialog';

interface InvoiceFormProps {
  propInvoice?: Invoice;
  propClientId?: string;
  propJobId?: string;
  propInvoiceId?: string;
  isEditView?: boolean;
  hasContractTemplates?: boolean;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  propInvoice,
  propClientId,
  propJobId,
  propInvoiceId,
  isEditView: propIsEditView = false,
  hasContractTemplates
}) => {
  const navigate = useNavigate();
  const { selectedCompany } = useCompanyContext();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<Invoice>({
    id: '',
    clientId: '',
    companyId: selectedCompany?.id || '',
    jobId: '',
    number: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    status: 'draft',
    contractStatus: 'pending',
    notes: '',
    contractTerms: '',
    shootingDate: format(new Date(), 'yyyy-MM-dd'),
    items: [],
    paymentSchedules: [],
    pdfUrl: '',
    viewLink: ''
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isContractTemplateDialogOpen, setIsContractTemplateDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (propInvoice) {
          setInvoice(propInvoice);
        } else if (propClientId) {
          setInvoice(prev => ({ ...prev, clientId: propClientId }));
        } else if (propJobId) {
          setInvoice(prev => ({ ...prev, jobId: propJobId }));
        }

        const fetchedClients = await getClients(selectedCompany?.id);
        setClients(fetchedClients);

        if (propClientId) {
          const fetchedJobs = await getClientJobs(propClientId);
          setJobs(fetchedJobs);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [propInvoice, propClientId, propJobId, selectedCompany?.id]);

  useEffect(() => {
    if (invoice.clientId) {
      const fetchJobs = async () => {
        try {
          const fetchedJobs = await getClientJobs(invoice.clientId);
          setJobs(fetchedJobs);
        } catch (error) {
          console.error('Error fetching jobs:', error);
          toast.error('Failed to load jobs.');
        }
      };

      fetchJobs();
    }
  }, [invoice.clientId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInvoice(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setInvoice(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: string, date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setInvoice(prev => ({ ...prev, [name]: formattedDate }));
    }
  };

  const handleSaveInvoice = async () => {
    setIsSaving(true);
    try {
      if (propInvoiceId) {
        // If it's an existing invoice, update it
        const updatedInvoice = { ...invoice, id: propInvoiceId, companyId: selectedCompany?.id || '' };
        await updateInvoice(updatedInvoice);
        toast.success('Invoice updated successfully.');
      } else {
        // If it's a new invoice, save it
        const newInvoice = { ...invoice, companyId: selectedCompany?.id || '' };
        await saveInvoice(newInvoice);
        toast.success('Invoice saved successfully.');
      }
      navigate('/invoices');
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (status: InvoiceStatus) => {
    try {
      if (propInvoiceId) {
        const updatedInvoice = { ...invoice, id: propInvoiceId, status: status };
        await updateInvoice(updatedInvoice);
        setInvoice(updatedInvoice);
        toast.success('Invoice status updated successfully.');
      } else {
        toast.error('Cannot update status for unsaved invoice.');
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status.');
    }
  };

  const handleContractStatusChange = async (contractStatus: ContractStatus) => {
    try {
      if (propInvoiceId) {
        const updatedInvoice = { ...invoice, id: propInvoiceId, contractStatus: contractStatus };
        await updateInvoice(updatedInvoice);
        setInvoice(updatedInvoice);
        toast.success('Contract status updated successfully.');
      } else {
        toast.error('Cannot update contract status for unsaved invoice.');
      }
    } catch (error) {
      console.error('Error updating contract status:', error);
      toast.error('Failed to update contract status.');
    }
  };

  const handleNotesChange = (value: string) => {
    setInvoice(prev => ({ ...prev, notes: value }));
  };

  const handleContractTermsChange = (value: string) => {
    setInvoice(prev => ({ ...prev, contractTerms: value }));
  };

  const getClientName = useCallback(() => {
    const selectedClient = clients.find(client => client.id === invoice.clientId);
    return selectedClient ? selectedClient.name : 'Select a client';
  }, [clients, invoice.clientId]);

  const getJobTitle = useCallback(() => {
    const selectedJob = jobs.find(job => job.id === invoice.jobId);
    return selectedJob ? selectedJob.title : 'Select a job';
  }, [jobs, invoice.jobId]);

  const clientOptions = useMemo(() => {
    return clients.map(client => ({
      value: client.id,
      label: client.name,
    }));
  }, [clients]);

  const jobOptions = useMemo(() => {
    return jobs.map(job => ({
      value: job.id,
      label: job.title,
    }));
  }, [jobs]);

  return (
    <PageTransition>
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              {propInvoiceId ? 'Edit Invoice' : 'Create Invoice'}
            </CardTitle>
            <div className="flex items-center gap-2">
              {propInvoiceId && (
                <DeleteInvoiceDialog 
                  invoiceId={propInvoiceId}
                  invoiceNumber={invoice.number}
                />
              )}
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
          
          <CardDescription>
            {propInvoiceId ? 'Edit the invoice details.' : 'Create a new invoice.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientId">Client</Label>
                <Select onValueChange={(value) => handleSelectChange('clientId', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={getClientName()} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.map((client) => (
                      <SelectItem key={client.value} value={client.value}>
                        {client.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="jobId">Job</Label>
                <Select onValueChange={(value) => handleSelectChange('jobId', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={getJobTitle()} />
                  </SelectTrigger>
                  <SelectContent>
                    {jobOptions.map((job) => (
                      <SelectItem key={job.value} value={job.value}>
                        {job.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number">Invoice Number</Label>
                <Input
                  type="text"
                  id="number"
                  name="number"
                  value={invoice.number}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="date">Invoice Date</Label>
                <DatePicker
                  mode="single"
                  selected={invoice.date ? new Date(invoice.date) : undefined}
                  onSelect={(date) => handleDateChange('date', date)}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <DatePicker
                  mode="single"
                  selected={invoice.dueDate ? new Date(invoice.dueDate) : undefined}
                  onSelect={(date) => handleDateChange('dueDate', date)}
                />
              </div>
              <div>
                <Label htmlFor="shootingDate">Shooting Date</Label>
                <DatePicker
                  mode="single"
                  selected={invoice.shootingDate ? new Date(invoice.shootingDate) : undefined}
                  onSelect={(date) => handleDateChange('shootingDate', date)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                type="number"
                id="amount"
                name="amount"
                value={invoice.amount}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select onValueChange={(value) => handleStatusChange(value as InvoiceStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={invoice.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasContractTemplates && (
                <div>
                  <Label htmlFor="contractStatus">Contract Status</Label>
                  <Select onValueChange={(value) => handleContractStatusChange(value as ContractStatus)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={invoice.contractStatus} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <RichTextEditor value={invoice.notes} onChange={handleNotesChange} />
            </div>

            {hasContractTemplates && (
              <div>
                <Label htmlFor="contractTerms">Contract Terms</Label>
                <RichTextEditor value={invoice.contractTerms} onChange={handleContractTermsChange} />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveInvoice} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Invoice'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageTransition>
  );
};

export default InvoiceForm;
