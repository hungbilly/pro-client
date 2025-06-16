
import React from 'react';
import PaymentScheduleTable from './PaymentScheduleTable';
import PaymentMethodsSection from '@/components/invoices/PaymentMethodsSection';
import { Invoice } from '@/types';

interface PaymentInfoSectionProps {
  invoice: Invoice;
  paymentMethods?: string;
  isClientView: boolean;
  updatingPaymentId: string | null;
  onUpdateStatus: (paymentId: string, newStatus: 'paid' | 'unpaid' | 'write-off') => void;
  onUpdatePaymentDate?: (paymentId: string, paymentDate: string) => void;
  formatCurrency: (amount: number) => string;
}

const PaymentInfoSection: React.FC<PaymentInfoSectionProps> = ({ 
  invoice, 
  paymentMethods,
  isClientView,
  updatingPaymentId,
  onUpdateStatus,
  onUpdatePaymentDate,
  formatCurrency
}) => {
  console.log('[PaymentInfoSection] ===== DETAILED RENDER DEBUG =====');
  console.log('[PaymentInfoSection] Invoice ID:', invoice.id);
  console.log('[PaymentInfoSection] Is client view:', isClientView);
  console.log('[PaymentInfoSection] Payment schedules received:', {
    exists: !!invoice.paymentSchedules,
    isArray: Array.isArray(invoice.paymentSchedules),
    length: invoice.paymentSchedules?.length || 0,
    type: typeof invoice.paymentSchedules,
    raw: invoice.paymentSchedules
  });
  
  if (invoice.paymentSchedules && Array.isArray(invoice.paymentSchedules)) {
    console.log('[PaymentInfoSection] Individual payment schedules:');
    invoice.paymentSchedules.forEach((ps, index) => {
      console.log(`[PaymentInfoSection] Schedule ${index}:`, {
        id: ps.id,
        dueDate: ps.dueDate,
        percentage: ps.percentage,
        description: ps.description,
        status: ps.status
      });
    });
  }
  console.log('[PaymentInfoSection] ===============================');

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-md">
        <h5 className="font-medium text-blue-800 dark:text-blue-400 mb-2">PaymentInfoSection Debug:</h5>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <div>Has payment schedules: {invoice.paymentSchedules && invoice.paymentSchedules.length > 0 ? 'YES' : 'NO'}</div>
          <div>Payment schedules count: {invoice.paymentSchedules?.length || 0}</div>
          <div>Will render PaymentScheduleTable: {invoice.paymentSchedules && invoice.paymentSchedules.length > 0 ? 'YES' : 'NO'}</div>
        </div>
      </div>
      
      {invoice.paymentSchedules && invoice.paymentSchedules.length > 0 && (
        <PaymentScheduleTable 
          paymentSchedules={invoice.paymentSchedules}
          amount={invoice.amount}
          isClientView={isClientView}
          updatingPaymentId={updatingPaymentId}
          onUpdateStatus={onUpdateStatus}
          formatCurrency={formatCurrency}
          onUpdatePaymentDate={onUpdatePaymentDate}
        />
      )}
      <PaymentMethodsSection paymentMethods={paymentMethods} />
    </div>
  );
};

export default PaymentInfoSection;
