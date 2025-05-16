
import React from 'react';
import { CreditCard } from 'lucide-react';

interface PaymentMethodsSectionProps {
  paymentMethods?: string;
}

const PaymentMethodsSection: React.FC<PaymentMethodsSectionProps> = ({ paymentMethods }) => {
  if (!paymentMethods) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-2 gap-2">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">Payment Methods</h4>
      </div>
      <div className="text-sm text-muted-foreground whitespace-pre-line">
        {paymentMethods}
      </div>
    </div>
  );
};

export default PaymentMethodsSection;
