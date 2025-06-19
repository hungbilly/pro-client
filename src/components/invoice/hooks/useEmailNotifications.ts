
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EmailNotificationData {
  templateName: string;
  recipientEmail: string;
  variables: {
    client_name: string;
    invoice_number: string;
    invoice_amount?: string;
    acceptance_date: string;
    company_name: string;
    accepted_by?: string;
  };
}

export const useEmailNotifications = () => {
  const sendNotification = async (data: EmailNotificationData) => {
    try {
      console.log('[EmailNotifications] Sending notification with template:', data.templateName);
      
      const { data: result, error } = await supabase.functions.invoke('send-system-email', {
        body: {
          templateName: data.templateName,
          recipientEmail: data.recipientEmail,
          variables: data.variables,
          category: 'notification'
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

  const sendInvoiceAcceptedNotification = async (
    invoiceNumber: string,
    clientName: string,
    invoiceAmount: number,
    companyName: string,
    companyEmail: string,
    currency: string = 'USD'
  ) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };

    return sendNotification({
      templateName: 'invoice_accepted_notification',
      recipientEmail: companyEmail,
      variables: {
        client_name: clientName,
        invoice_number: invoiceNumber,
        invoice_amount: formatCurrency(invoiceAmount),
        acceptance_date: format(new Date(), 'MMMM d, yyyy'),
        company_name: companyName,
      }
    });
  };

  const sendContractAcceptedNotification = async (
    invoiceNumber: string,
    clientName: string,
    acceptedBy: string,
    companyName: string,
    companyEmail: string
  ) => {
    return sendNotification({
      templateName: 'contract_accepted_notification',
      recipientEmail: companyEmail,
      variables: {
        client_name: clientName,
        invoice_number: invoiceNumber,
        accepted_by: acceptedBy,
        acceptance_date: format(new Date(), 'MMMM d, yyyy'),
        company_name: companyName,
      }
    });
  };

  return {
    sendInvoiceAcceptedNotification,
    sendContractAcceptedNotification,
  };
};
