
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const generateInvoiceNumber = async (): Promise<string> => {
  const today = format(new Date(), 'yyyyMMdd');
  
  try {
    // Get all invoice numbers that start with today's date
    const { data, error } = await supabase
      .from('invoices')
      .select('number')
      .like('number', `${today}-%`);
    
    if (error) {
      console.error('Error fetching existing invoice numbers:', error);
      // Fallback to sequence 1 if there's an error
      return `${today}-1`;
    }
    
    // Extract sequence numbers from existing invoices
    const sequenceNumbers = data
      .map(invoice => {
        const parts = invoice.number.split('-');
        if (parts.length === 2 && parts[0] === today) {
          return parseInt(parts[1], 10);
        }
        return 0;
      })
      .filter(num => !isNaN(num) && num > 0);
    
    // Find the next sequence number
    const nextSequence = sequenceNumbers.length > 0 
      ? Math.max(...sequenceNumbers) + 1 
      : 1;
    
    return `${today}-${nextSequence}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    return `${today}-1`;
  }
};
