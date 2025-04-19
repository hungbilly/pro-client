
import React from 'react';
import { format } from 'date-fns';

interface ContractSignatureProps {
  signerName: string;
  signedAt: string;
}

const ContractSignature: React.FC<ContractSignatureProps> = ({
  signerName,
  signedAt,
}) => {
  return (
    <div className="border rounded-md p-6 max-w-md">
      <div className="mb-4 border-b pb-2">
        <div className="font-['Dancing_Script'] text-3xl mb-1">
          {signerName}
        </div>
        <div className="border-t border-dotted w-full" />
      </div>
      <div className="text-sm text-gray-600">
        <div className="font-medium">{signerName}</div>
        <div>Signed on {format(new Date(signedAt), 'dd MMMM yyyy hh:mm a')}</div>
      </div>
    </div>
  );
};

export default ContractSignature;
