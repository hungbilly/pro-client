
// Add custom type declaration to extend InvoiceFormProps
declare namespace React {
  interface InvoiceFormProps {
    invoice?: any;
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
  }
}
