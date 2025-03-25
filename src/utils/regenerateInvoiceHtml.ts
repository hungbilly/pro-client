
import { supabase, logDebug, logError } from '@/integrations/supabase/client';
import { storeInvoiceHtml } from './generateInvoiceHtml';

/**
 * Regenerates the HTML content for an invoice and updates it in the database
 */
export const regenerateInvoiceHtml = async (invoiceId: string): Promise<boolean> => {
  try {
    logDebug('Triggering HTML regeneration for invoice', { invoiceId });
    
    // First try to call the edge function to trigger regeneration
    const { data, error } = await supabase.functions.invoke('regenerate-invoice-html', {
      body: { invoiceId }
    });
    
    if (error) {
      logError('Error calling regenerate-invoice-html function', error);
      // Fall back to client-side regeneration
      logDebug('Falling back to client-side HTML regeneration');
      const html = await storeInvoiceHtml(invoiceId);
      return !!html;
    }
    
    if (data?.success) {
      // Edge function succeeded, now do the actual regeneration client-side
      const html = await storeInvoiceHtml(invoiceId);
      return !!html;
    }
    
    return false;
  } catch (error) {
    logError('Error in regenerateInvoiceHtml', error);
    return false;
  }
};
