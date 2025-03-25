
import React, { Component } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { withRouter } from '@/components/hoc/withRouter';
import { supabase, logDebug, logError } from '@/integrations/supabase/client';
import { Invoice, InvoiceItem, PaymentSchedule } from '@/types';
import { generateViewLink } from '@/lib/utils';
import InvoiceFormContent from './InvoiceFormContent';
import { createInvoice, updateInvoice } from '@/lib/storage';

interface Props {
  invoice?: Invoice;
  clientId?: string;
  jobId?: string;
  invoiceId?: string;
  contractTemplates: Array<{
    id: string;
    name: string;
    content?: string;
    description?: string;
  }>;
  checkDuplicateInvoiceNumber: (number: string, currentInvoiceId?: string) => Promise<boolean>;
  onInvoiceSaved?: (savedInvoiceId: string) => Promise<void>;
  navigate: (path: string) => void;
  params?: Record<string, string>;
  location?: { pathname: string; search: string; state: any; key: string };
}

interface State {
  loading: boolean;
  saving: boolean;
  invoice: Invoice;
  errors: { [key: string]: string };
}

class InvoiceForm extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    
    const defaultInvoice: Invoice = {
      id: props.invoiceId || uuidv4(),
      clientId: props.clientId || '',
      jobId: props.jobId || null,
      number: '',
      amount: 0,
      date: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      status: 'draft',
      notes: '',
      contractTerms: '',
      viewLink: generateViewLink(),
      items: [],
      paymentSchedules: [],
    };

    this.state = {
      loading: false,
      saving: false,
      invoice: props.invoice || defaultInvoice,
      errors: {},
    };
  }

  handleSubmit = async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    const { invoice } = this.state;
    const { invoiceId } = this.props;

    try {
      this.setState({ saving: true });

      // Validate required fields
      const errors: { [key: string]: string } = {};
      if (!invoice.number) errors.number = 'Invoice number is required';
      if (!invoice.clientId) errors.clientId = 'Client is required';
      if (!invoice.date) errors.date = 'Invoice date is required';
      if (!invoice.dueDate) errors.dueDate = 'Due date is required';

      if (Object.keys(errors).length > 0) {
        this.setState({ errors });
        return;
      }

      // Check for duplicate invoice number
      const isDuplicate = await this.props.checkDuplicateInvoiceNumber(invoice.number, invoiceId);
      if (isDuplicate) {
        this.setState({ errors: { number: 'This invoice number already exists' } });
        return;
      }

      // Save the invoice
      const savedInvoice = invoiceId
        ? await updateInvoice(invoice)
        : await createInvoice(invoice);

      if (savedInvoice) {
        toast.success(`Invoice ${invoiceId ? 'updated' : 'created'} successfully`);
        
        // Call the onInvoiceSaved callback if provided
        if (this.props.onInvoiceSaved) {
          await this.props.onInvoiceSaved(savedInvoice.id);
        }
        
        // Navigate based on context
        if (invoice.jobId) {
          this.props.navigate(`/job/${invoice.jobId}`);
        } else if (invoice.clientId) {
          this.props.navigate(`/client/${invoice.clientId}`);
        } else {
          this.props.navigate('/invoices');
        }
        
        return savedInvoice;
      }
    } catch (error) {
      logError('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    } finally {
      this.setState({ saving: false });
    }
  };

  handleChange = (field: keyof Invoice, value: any) => {
    this.setState(prevState => ({
      invoice: { ...prevState.invoice, [field]: value },
      errors: { ...prevState.errors, [field]: '' },
    }));
  };

  handleItemsChange = (items: InvoiceItem[]) => {
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    
    this.setState(prevState => ({
      invoice: {
        ...prevState.invoice,
        items,
        amount: totalAmount,
      },
    }));
  };

  handlePaymentSchedulesChange = (paymentSchedules: PaymentSchedule[]) => {
    this.setState(prevState => ({
      invoice: {
        ...prevState.invoice,
        paymentSchedules,
      },
    }));
  };

  render() {
    const { loading, saving, invoice, errors } = this.state;
    const { contractTemplates } = this.props;

    if (loading) {
      return <div>Loading...</div>;
    }

    return (
      <InvoiceFormContent
        invoice={invoice}
        errors={errors}
        saving={saving}
        contractTemplates={contractTemplates}
        onChange={this.handleChange}
        onItemsChange={this.handleItemsChange}
        onPaymentSchedulesChange={this.handlePaymentSchedulesChange}
        onSubmit={this.handleSubmit}
      />
    );
  }
}

// This component wrapper allows us to handle the onInvoiceSaved callback 
// without modifying the original InvoiceForm component
const InvoiceFormWithCallback = (props: Omit<Props, 'navigate' | 'params' | 'location'>) => {
  const { onInvoiceSaved, ...restProps } = props;
  
  // Clone the original handleSubmit to add our callback
  const originalHandleSubmit = InvoiceForm.prototype.handleSubmit;
  
  InvoiceForm.prototype.handleSubmit = async function(...args) {
    const result = await originalHandleSubmit.apply(this, args);
    
    // If the form was submitted successfully and we have a callback
    if (result?.id && onInvoiceSaved) {
      await onInvoiceSaved(result.id);
    }
    
    return result;
  };
  
  return <InvoiceForm {...restProps} />;
};

export default withRouter(InvoiceFormWithCallback);
