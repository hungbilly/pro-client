
import { ContractTemplate, Invoice } from '@/types';

export interface InvoiceFormProps {
  invoice?: Invoice;
  clientId?: string;
  jobId?: string;
  invoiceId?: string;
  isEditView?: boolean;
  contractTemplates: ContractTemplate[];
  checkDuplicateInvoiceNumber: (number: string, currentInvoiceId?: string) => Promise<boolean>;
  onInvoiceDeleted: (invoiceId: string) => void;
}

declare const InvoiceForm: React.FC<InvoiceFormProps>;
export default InvoiceForm;

