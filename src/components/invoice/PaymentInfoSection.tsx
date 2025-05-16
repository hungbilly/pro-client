
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
  return (
    <div className="space-y-4">
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
