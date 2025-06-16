
import { Invoice, Client } from '@/types';
import { formatCurrency } from '@/lib/utils';

export const generateShareMessage = (
  invoice: Invoice,
  client: Client,
  companyName: string,
  currency: string
): string => {
  const invoiceLink = `${window.location.origin}/invoice/${invoice.viewLink}`;
  const formattedAmount = formatCurrency(invoice.amount, currency);
  const dueDate = new Date(invoice.dueDate).toLocaleDateString();
  
  return `Hi ${client.name},
    
Your invoice #${invoice.number} from ${companyName} is ready for review.
    
Amount: ${formattedAmount}
Due Date: ${dueDate}
    
Please view and accept your invoice here: ${invoiceLink}
    
Thank you!`;
};
