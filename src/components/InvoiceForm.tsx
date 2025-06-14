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
import PaymentScheduleManager from '@/components/invoice/PaymentScheduleManager';
import { generateInvoiceNumber } from '@/utils/invoiceNumberGenerator';
import AddProductPackageDialog from '@/components/AddProductPackageDialog';
import AddDiscountDialog from '@/components/AddDiscountDialog';
import { supabase } from '@/integrations/supabase/client';
interface InvoiceFormProps {
  propInvoice?: Invoice;
  propClientId?: string;
  propJobId?: string;
  propInvoiceId?: string;
  isEditView?: boolean;
  hasContractTemplates?: boolean;
}
interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
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
  const {
    selectedCompany
  } = useCompanyContext();
  const {
    user
  } = useAuth();
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
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isContractTemplateDialogOpen, setIsContractTemplateDialogOpen] = useState(false);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddDiscountDialogOpen, setIsAddDiscountDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState<InvoiceItem[]>([]);
  const [manualItem, setManualItem] = useState({
    name: '',
    description: '',
    quantity: 1,
    rate: 0
  });

  // New state for contract templates
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [selectedContractTemplate, setSelectedContractTemplate] = useState<string>('');
  const [loadingContractTemplates, setLoadingContractTemplates] = useState(false);

  // Add state for percentage discount
  const [percentageDiscount, setPercentageDiscount] = useState<{
    value: number;
    name: string;
    description: string;
  } | null>(null);

  // Helper function to ensure a number is valid
  const ensureValidNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Helper function to safely format currency
  const formatCurrency = (amount: any): string => {
    const validAmount = ensureValidNumber(amount);
    return validAmount.toFixed(2);
  };

  // Fetch contract templates
  const fetchContractTemplates = async () => {
    if (!selectedCompany) return;
    try {
      setLoadingContractTemplates(true);
      const {
        data,
        error
      } = await supabase.from('contract_templates').select('id, name, content, description').eq('company_id', selectedCompany.id).order('name', {
        ascending: true
      });
      if (error) throw error;
      setContractTemplates(data || []);
    } catch (error) {
      console.error('Error fetching contract templates:', error);
      toast.error('Failed to load contract templates');
    } finally {
      setLoadingContractTemplates(false);
    }
  };
  useEffect(() => {
    if (selectedCompany) {
      fetchContractTemplates();
    }
  }, [selectedCompany]);
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (propInvoice) {
          // Ensure amount is a valid number
          const safeInvoice = {
            ...propInvoice,
            amount: ensureValidNumber(propInvoice.amount)
          };
          setInvoice(safeInvoice);
          // Fetch client and job data for the existing invoice
          if (propInvoice.clientId) {
            const clientData = await getClient(propInvoice.clientId);
            setClient(clientData);
          }
          if (propInvoice.jobId) {
            const jobData = await getJob(propInvoice.jobId);
            setJob(jobData);
          }
        } else {
          // For new invoices, generate invoice number and set data from props
          const invoiceNumber = await generateInvoiceNumber();
          if (propJobId) {
            const jobData = await getJob(propJobId);
            setJob(jobData);
            if (jobData?.clientId) {
              const clientData = await getClient(jobData.clientId);
              setClient(clientData);

              // Use job date if available, otherwise use today's date
              const jobDate = jobData.date ? jobData.date : format(new Date(), 'yyyy-MM-dd');
              setInvoice(prev => ({
                ...prev,
                jobId: propJobId,
                clientId: jobData.clientId,
                number: invoiceNumber,
                amount: 0,
                shootingDate: jobDate // Set to job's date
              }));
            }
          } else if (propClientId) {
            const clientData = await getClient(propClientId);
            setClient(clientData);
            setInvoice(prev => ({
              ...prev,
              clientId: propClientId,
              number: invoiceNumber,
              amount: 0
            }));
          } else {
            // Even if no client or job, set the generated invoice number
            setInvoice(prev => ({
              ...prev,
              number: invoiceNumber,
              amount: 0
            }));
          }
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

  // Handle contract template selection
  const handleContractTemplateSelect = (templateId: string) => {
    if (templateId === 'manual') {
      setSelectedContractTemplate('manual');
      return;
    }
    const template = contractTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedContractTemplate(templateId);
      setInvoice(prev => ({
        ...prev,
        contractTerms: template.content
      }));
      toast.success(`Contract template "${template.name}" applied`);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {
      name,
      value
    } = e.target;
    if (name === 'amount') {
      // Ensure amount is always a valid number
      const numericValue = ensureValidNumber(value);
      setInvoice(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setInvoice(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  const handleSelectChange = (name: string, value: string) => {
    setInvoice(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleDateChange = (name: string, date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setInvoice(prev => ({
        ...prev,
        [name]: formattedDate
      }));
    }
  };
  const handlePackageSelect = (items: InvoiceItem[]) => {
    // Add new packages to existing items
    const newItems = [...invoice.items, ...items];
    const totalAmount = calculateTotalWithDiscount();
    setInvoice(prev => ({
      ...prev,
      items: newItems,
      amount: totalAmount
    }));
    toast.success(`Added ${items.length} item(s) to invoice`);
  };
  const handleDiscountsSelect = (discounts: InvoiceItem[]) => {
    setSelectedDiscounts(discounts);
    const updatedItems = [...invoice.items.filter(item => !item.id?.startsWith('template-discount-') && !item.id?.startsWith('manual-discount-')), ...discounts];
    const totalAmount = calculateTotalWithDiscount();
    setInvoice(prev => ({
      ...prev,
      items: updatedItems,
      amount: totalAmount
    }));
  };
  const addManualItem = () => {
    if (!manualItem.name || manualItem.rate <= 0) {
      toast.error('Please enter item name and rate');
      return;
    }
    const newItem: InvoiceItem = {
      id: `manual-${Date.now()}`,
      name: manualItem.name,
      description: manualItem.description,
      quantity: manualItem.quantity,
      rate: manualItem.rate,
      amount: manualItem.quantity * manualItem.rate
    };
    const newItems = [...invoice.items, newItem];
    setInvoice(prev => ({
      ...prev,
      items: newItems
    }));

    // Recalculate total with current discount
    const totalAmount = calculateTotalWithDiscount();
    setInvoice(prev => ({
      ...prev,
      amount: totalAmount
    }));

    // Reset manual item form
    setManualItem({
      name: '',
      description: '',
      quantity: 1,
      rate: 0
    });
    toast.success('Manual item added to invoice');
  };
  const removeItem = (itemId: string) => {
    const updatedItems = invoice.items.filter(item => item.id !== itemId);
    setInvoice(prev => ({
      ...prev,
      items: updatedItems
    }));

    // Recalculate total with current discount
    const totalAmount = calculateTotalWithDiscount();
    setInvoice(prev => ({
      ...prev,
      amount: totalAmount
    }));
    toast.success('Item removed from invoice');
  };
  const calculateTotalWithDiscount = () => {
    const productTotal = ensureValidNumber(invoice.items.filter(item => !item.id?.startsWith('template-discount-') && !item.id?.startsWith('manual-discount-')).reduce((sum, item) => sum + ensureValidNumber(item.amount || 0), 0));
    const fixedDiscounts = ensureValidNumber(invoice.items.filter(item => item.id?.startsWith('template-discount-') || item.id?.startsWith('manual-discount-')).reduce((sum, item) => sum + ensureValidNumber(item.amount || 0), 0));
    if (percentageDiscount) {
      // If there's a percentage discount, apply it to the product total only
      const discountedTotal = productTotal * (1 - percentageDiscount.value / 100);
      return discountedTotal;
    } else {
      // If no percentage discount, apply fixed discounts as line items
      return productTotal + fixedDiscounts;
    }
  };
  const handleSaveInvoice = async () => {
    setIsSaving(true);
    try {
      // Ensure amount is valid before saving
      const safeInvoice = {
        ...invoice,
        amount: ensureValidNumber(invoice.amount),
        companyId: selectedCompany?.id || ''
      };
      if (propInvoiceId) {
        // If it's an existing invoice, update it
        const updatedInvoice = {
          ...safeInvoice,
          id: propInvoiceId
        };
        await updateInvoice(updatedInvoice);
        toast.success('Invoice updated successfully.');
        // Navigate back to the invoice view page instead of invoice list
        navigate(`/invoice/${propInvoiceId}`);
      } else {
        // If it's a new invoice, save it
        const savedInvoice = await saveInvoice(safeInvoice);
        toast.success('Invoice saved successfully.');
        // Navigate to the new invoice view page
        if (savedInvoice?.id) {
          navigate(`/invoice/${savedInvoice.id}`);
        } else {
          navigate('/invoices');
        }
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice.');
    } finally {
      setIsSaving(false);
    }
  };
  const handleNotesChange = (value: string) => {
    setInvoice(prev => ({
      ...prev,
      notes: value
    }));
  };
  const handleContractTermsChange = (value: string) => {
    setInvoice(prev => ({
      ...prev,
      contractTerms: value
    }));
  };
  const handlePaymentSchedulesUpdate = (schedules: PaymentSchedule[]) => {
    setInvoice(prev => ({
      ...prev,
      paymentSchedules: schedules
    }));
  };
  const handleAddItems = (items: InvoiceItem[]) => {
    // Add new items to existing items
    const newItems = [...invoice.items, ...items];
    setInvoice(prev => ({
      ...prev,
      items: newItems
    }));

    // Recalculate total with current discount
    const totalAmount = calculateTotalWithDiscount();
    setInvoice(prev => ({
      ...prev,
      amount: totalAmount
    }));
    toast.success(`Added ${items.length} item(s) to invoice`);
  };
  const handleAddDiscount = (discountData: any) => {
    if (discountData.type === 'percentage') {
      // Handle percentage discount - remove all existing discounts and apply percentage
      setPercentageDiscount({
        value: discountData.value,
        name: discountData.name,
        description: discountData.description
      });

      // Remove all existing discount line items
      const itemsWithoutDiscounts = invoice.items.filter(item => !item.id?.startsWith('template-discount-') && !item.id?.startsWith('manual-discount-'));
      setInvoice(prev => ({
        ...prev,
        items: itemsWithoutDiscounts
      }));

      // Recalculate total with percentage discount
      const totalAmount = calculateTotalWithDiscount();
      setInvoice(prev => ({
        ...prev,
        amount: totalAmount
      }));
      toast.success(`Applied ${discountData.value}% discount to total invoice`);
    } else {
      // Handle fixed discount as line items (existing behavior)
      // Remove percentage discount if applying fixed discount
      if (percentageDiscount) {
        setPercentageDiscount(null);
      }
      const newItems = [...invoice.items, ...discountData];
      setInvoice(prev => ({
        ...prev,
        items: newItems
      }));
      const totalAmount = calculateTotalWithDiscount();
      setInvoice(prev => ({
        ...prev,
        amount: totalAmount
      }));
      toast.success(`Added ${discountData.length} discount(s) to invoice`);
    }
  };
  const subtotal = ensureValidNumber(invoice.items.filter(item => !item.id?.startsWith('template-discount-') && !item.id?.startsWith('manual-discount-')).reduce((sum, item) => sum + ensureValidNumber(item.amount || 0), 0));
  const selectedProducts = invoice.items.filter(item => !item.id?.startsWith('template-discount-') && !item.id?.startsWith('manual-discount-'));
  const selectedDiscountItems = invoice.items.filter(item => item.id?.startsWith('template-discount-') || item.id?.startsWith('manual-discount-'));

  // Check if there are existing fixed discounts
  const hasExistingFixedDiscounts = selectedDiscountItems.length > 0;

  // Recalculate amount whenever subtotal or discounts change
  React.useEffect(() => {
    const totalAmount = calculateTotalWithDiscount();
    if (totalAmount !== invoice.amount) {
      setInvoice(prev => ({
        ...prev,
        amount: totalAmount
      }));
    }
  }, [subtotal, percentageDiscount, selectedDiscountItems.length]);
  return <PageTransition>
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="w-full border-0 shadow-none sm:border sm:shadow-sm">
          <CardHeader className="space-y-4 px-4 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-xl font-bold break-words sm:text-2xl lg:text-3xl">
                  {propInvoiceId ? 'Edit Invoice' : 'Create Invoice'}
                </CardTitle>
                <CardDescription className="mt-2 break-words text-sm">
                  {propInvoiceId ? 'Edit the invoice details.' : 'Create a new invoice.'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {propInvoiceId && <DeleteInvoiceDialog invoiceId={propInvoiceId} invoiceNumber={invoice.number} />}
                <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="flex-shrink-0">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-0 sm:px-6 px-0">
            <div className="space-y-6">
              {/* Client Information Display (Read-only) */}
              {client && <div className="rounded-lg bg-muted p-4">
                  <Label className="text-base font-medium">Client</Label>
                  <div className="mt-2">
                    <p className="font-medium break-words">{client.name}</p>
                    <p className="text-sm text-muted-foreground break-words">{client.email}</p>
                  </div>
                </div>}

              {/* Job Information Display (Read-only) */}
              {job && <div className="rounded-lg bg-muted p-4">
                  <Label className="text-base font-medium">Job</Label>
                  <div className="mt-2">
                    <p className="font-medium break-words">{job.title}</p>
                    {job.description && <p className="text-sm text-muted-foreground break-words">{job.description}</p>}
                  </div>
                </div>}

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="min-w-0">
                    <Label htmlFor="number" className="text-sm">Invoice Number</Label>
                    <Input type="text" id="number" name="number" value={invoice.number} onChange={handleInputChange} placeholder="Auto-generated" className="mt-1" />
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor="date" className="text-sm">Invoice Date</Label>
                    <div className="mt-1">
                      <DatePicker mode="single" selected={invoice.date ? new Date(invoice.date) : undefined} onSelect={date => handleDateChange('date', date)} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor="shootingDate" className="text-sm">Job Date</Label>
                    <div className="mt-1">
                      <DatePicker mode="single" selected={invoice.shootingDate ? new Date(invoice.shootingDate) : undefined} onSelect={date => handleDateChange('shootingDate', date)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Package/Product Selector */}
              <Card>
                <CardHeader className="text-center px-4 py-4 sm:px-6 sm:py-6">
                  <CardTitle className="flex flex-col items-center gap-2 text-base sm:flex-row sm:justify-center sm:text-lg">
                    <Package className="h-5 w-5 flex-shrink-0" />
                    <span className="break-words text-center leading-tight">
                      Products & Services
                    </span>
                  </CardTitle>
                  <CardDescription className="break-words text-sm">
                    Add products and services to this invoice
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
                  <Button onClick={() => setIsAddProductDialogOpen(true)} className="h-auto min-h-[44px] w-full flex-wrap items-center justify-center gap-2 px-3 py-2 text-sm" variant="outline">
                    <Plus className="h-4 w-4 flex-shrink-0" />
                    <span className="break-words text-center leading-tight">
                      Add Product
                    </span>
                  </Button>
                  
                  {/* Selected Products Display */}
                  {selectedProducts.length > 0 && <div className="space-y-2">
                      <Label className="text-sm font-medium">Invoice Items</Label>
                      <div className="space-y-2">
                        {selectedProducts.map((item, index) => <div key={item.id || index} className="flex items-start justify-between gap-3 rounded-lg bg-muted p-3">
                            <div className="min-w-0 flex-1">
                              <div className="break-words text-sm font-medium">{item.name}</div>
                              {item.description && <div className="mt-1 break-words text-xs text-muted-foreground" dangerouslySetInnerHTML={{
                          __html: item.description
                        }} />}
                              <div className="mt-1 text-xs text-muted-foreground">
                                Qty: {item.quantity} × ${formatCurrency(item.rate)}
                              </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-2">
                              <div className="text-right">
                                <div className="text-sm font-medium">${formatCurrency(item.amount)}</div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeItem(item.id || '')} className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>)}
                      </div>
                    </div>}
                </CardContent>
              </Card>

              {/* Discount Selector */}
              <Card>
                <CardHeader className="text-center px-4 py-4 sm:px-6 sm:py-6">
                  <CardTitle className="flex flex-col items-center gap-2 text-base sm:flex-row sm:justify-center sm:text-lg">
                    <Percent className="h-5 w-5 flex-shrink-0" />
                    <span className="break-words text-center leading-tight">Discounts</span>
                  </CardTitle>
                  <CardDescription className="break-words text-sm">
                    Apply discounts to this invoice
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
                  <Button onClick={() => setIsAddDiscountDialogOpen(true)} className="h-auto min-h-[44px] w-full flex-wrap items-center justify-center gap-2 px-3 py-2 text-sm" variant="outline">
                    <Plus className="h-4 w-4 flex-shrink-0" />
                    <span className="break-words text-center leading-tight">Add Discount</span>
                  </Button>
                  
                  {/* Percentage Discount Display */}
                  {percentageDiscount && <div className="space-y-2">
                      <Label className="text-sm font-medium">Applied Percentage Discount</Label>
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="break-words text-sm font-medium text-red-700">{percentageDiscount.name}</div>
                            <div className="mt-1 break-words text-xs text-red-600">{percentageDiscount.description}</div>
                            <div className="mt-1 text-xs text-red-600">
                              {percentageDiscount.value}% off total invoice
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            <div className="text-right">
                              <div className="text-sm font-medium text-red-700">
                                -{percentageDiscount.value}%
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => {
                          setPercentageDiscount(null);
                          const totalAmount = calculateTotalWithDiscount();
                          setInvoice(prev => ({
                            ...prev,
                            amount: totalAmount
                          }));
                          toast.success('Percentage discount removed');
                        }} className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>}
                  
                  {/* Selected Fixed Discounts Display */}
                  {selectedDiscountItems.length > 0 && !percentageDiscount && <div className="space-y-2">
                      <Label className="text-sm font-medium">Applied Fixed Discounts</Label>
                      <div className="space-y-2">
                        {selectedDiscountItems.map((item, index) => <div key={item.id || index} className="rounded-lg border border-red-200 bg-red-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="break-words text-sm font-medium text-red-700">{item.name}</div>
                                {item.description && <div className="mt-1 break-words text-xs text-red-600" dangerouslySetInnerHTML={{
                            __html: item.description
                          }} />}
                              </div>
                              <div className="flex flex-shrink-0 items-center gap-2">
                                <div className="text-right">
                                  <div className="text-sm font-medium text-red-700">-${formatCurrency(Math.abs(ensureValidNumber(item.amount)))}</div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeItem(item.id || '')} className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>)}
                      </div>
                    </div>}
                </CardContent>
              </Card>

              {/* Invoice Summary */}
              {(selectedProducts.length > 0 || selectedDiscountItems.length > 0 || percentageDiscount) && <Card className="bg-muted/50">
                  <CardContent className="px-4 py-4 sm:px-6 sm:py-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Subtotal:</span>
                        <span className="text-sm">${formatCurrency(subtotal)}</span>
                      </div>
                      {percentageDiscount && <div className="flex justify-between items-center text-red-600">
                          <span className="text-sm">Discount ({percentageDiscount.value}%):</span>
                          <span className="text-sm">-${formatCurrency(subtotal * percentageDiscount.value / 100)}</span>
                        </div>}
                      {selectedDiscountItems.length > 0 && !percentageDiscount && <div className="flex justify-between items-center text-red-600">
                          <span className="text-sm">Total Discounts:</span>
                          <span className="text-sm">-${formatCurrency(Math.abs(ensureValidNumber(selectedDiscountItems.reduce((sum, item) => sum + ensureValidNumber(item.amount), 0))))}</span>
                        </div>}
                      <Separator />
                      <div className="flex justify-between items-center font-medium">
                        <span>Total:</span>
                        <span>${formatCurrency(invoice.amount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>}

              {/* Payment Schedule Manager */}
              <PaymentScheduleManager paymentSchedules={invoice.paymentSchedules || []} invoiceAmount={ensureValidNumber(invoice.amount)} onUpdateSchedules={handlePaymentSchedulesUpdate} />

              <div>
                <Label htmlFor="notes" className="text-sm">Notes</Label>
                <RichTextEditor value={invoice.notes} onChange={handleNotesChange} id="notes" className="mt-1" />
              </div>

              {hasContractTemplates && <div className="space-y-4">
                  <div>
                    <Label htmlFor="contractTemplate" className="text-sm">Contract Template</Label>
                    <Select onValueChange={handleContractTemplateSelect} value={selectedContractTemplate}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose a contract template or type manually" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Type manually</SelectItem>
                        {contractTemplates.map(template => <SelectItem key={template.id} value={template.id}>
                            <div className="flex flex-col">
                              <span>{template.name}</span>
                              {template.description && <span className="text-muted-foreground text-xs">
                                  {template.description}
                                </span>}
                            </div>
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="contractTerms" className="text-sm">Contract Terms</Label>
                    <RichTextEditor value={invoice.contractTerms} onChange={handleContractTermsChange} id="contract-terms-editor" className="mt-1" />
                  </div>
                </div>}

              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <Button onClick={handleSaveInvoice} disabled={isSaving} className="flex-1 sm:flex-none">
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Invoice'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <AddProductPackageDialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen} onAddItems={handleAddItems} />

        <AddDiscountDialog open={isAddDiscountDialogOpen} onOpenChange={setIsAddDiscountDialogOpen} onAddDiscount={handleAddDiscount} subtotal={subtotal} hasExistingFixedDiscounts={hasExistingFixedDiscounts} />
      </div>
    </PageTransition>;
};
export default InvoiceForm;