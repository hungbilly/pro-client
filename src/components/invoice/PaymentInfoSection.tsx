
import React from 'react';
import { PaymentScheduleTable } from './PaymentScheduleTable';
import PaymentMethodsSection from '@/components/invoices/PaymentMethodsSection';
import { Invoice } from '@/types';

interface PaymentInfoSectionProps {
  invoice: Invoice;
  paymentMethods?: string;
}

const PaymentInfoSection: React.FC<PaymentInfoSectionProps> = ({ invoice, paymentMethods }) => {
  return (
    <div className="space-y-4">
      {invoice.paymentSchedules && invoice.paymentSchedules.length > 0 && (
        <PaymentScheduleTable schedules={invoice.paymentSchedules} />
      )}
      <PaymentMethodsSection paymentMethods={paymentMethods} />
    </div>
  );
};

export default PaymentInfoSection;
