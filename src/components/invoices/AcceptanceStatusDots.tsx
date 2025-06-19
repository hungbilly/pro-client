
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AcceptanceStatusDotsProps {
  isInvoiceAccepted: boolean;
  isContractAccepted: boolean;
}

const AcceptanceStatusDots: React.FC<AcceptanceStatusDotsProps> = ({
  isInvoiceAccepted,
  isContractAccepted,
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <div 
              className={`w-3 h-3 rounded-full ${
                isInvoiceAccepted ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              aria-label={`Invoice ${isInvoiceAccepted ? 'accepted' : 'pending'}`}
            />
            <div 
              className={`w-3 h-3 rounded-full ${
                isContractAccepted ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              aria-label={`Contract ${isContractAccepted ? 'accepted' : 'pending'}`}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Invoice: {isInvoiceAccepted ? 'Accepted' : 'Pending'} | 
            Contract: {isContractAccepted ? 'Accepted' : 'Pending'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AcceptanceStatusDots;
