import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useEmailNotifications = () => {
  const sendInvoiceAcceptanceNotification = async (
    invoiceId: string,
    acceptanceType: 'invoice' | 'contract',
    clientName?: string,
    acceptedBy?: string
  ) => {
    try {
      console.log('[EmailNotifications] Sending acceptance notification:', {
        invoiceId,
        acceptanceType,
        clientName,
        acceptedBy
      });
      
      const { data: result, error } = await supabase.functions.invoke('handle-invoice-acceptance', {
        body: {
          invoiceId,
          acceptanceType,
          clientName,
          acceptedBy
        }
      });

      if (error) {
        console.error('[EmailNotifications] Error sending notification:', error);
        throw error;
      }

      console.log('[EmailNotifications] Notification sent successfully:', result);
      return result;
    } catch (error) {
      console.error('[EmailNotifications] Failed to send notification:', error);
      // Don't show error toast to user as this is a background operation
      // Just log the error for debugging
      throw error;
    }
  };

  // Deprecated methods - keeping for backwards compatibility but they now use the new function
  const sendInvoiceAcceptedNotification = async (
    invoiceNumber: string,
    clientName: string,
    invoiceAmount: number,
    companyName: string,
    companyEmail: string,
    currency: string = 'USD'
  ) => {
    console.warn('[EmailNotifications] sendInvoiceAcceptedNotification is deprecated. Use sendInvoiceAcceptanceNotification instead.');
    // This method is deprecated but kept for backwards compatibility
    // The new method handles all the data fetching server-side
    throw new Error('This method is deprecated. Use sendInvoiceAcceptanceNotification instead.');
  };

  const sendContractAcceptedNotification = async (
    invoiceNumber: string,
    clientName: string,
    acceptedBy: string,
    companyName: string,
    companyEmail: string
  ) => {
    console.warn('[EmailNotifications] sendContractAcceptedNotification is deprecated. Use sendInvoiceAcceptanceNotification instead.');
    // This method is deprecated but kept for backwards compatibility
    // The new method handles all the data fetching server-side
    throw new Error('This method is deprecated. Use sendInvoiceAcceptanceNotification instead.');
  };

  return {
    sendInvoiceAcceptanceNotification,
    // Keep old methods for backwards compatibility
    sendInvoiceAcceptedNotification,
    sendContractAcceptedNotification,
  };
};
