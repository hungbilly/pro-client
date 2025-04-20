
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface InvoiceHeaderProps {
  isClientView: boolean;
  invoiceNumber: string;
  jobId?: string;
  clientId?: string;
}

const InvoiceHeader: React.FC<InvoiceHeaderProps> = ({
  isClientView,
  invoiceNumber,
  jobId,
  clientId
}) => {
  if (isClientView) {
    return (
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">Invoice #{invoiceNumber}</h1>
        <p className="text-muted-foreground">
          Please review and accept this invoice and contract terms.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-4">
      <Button asChild variant="ghost">
        <Link to="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>
      
      {jobId && (
        <Button asChild variant="ghost">
          <Link to={`/job/${jobId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job
          </Link>
        </Button>
      )}
      
      {clientId && (
        <Button asChild variant="ghost">
          <Link to={`/client/${clientId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Client
          </Link>
        </Button>
      )}
    </div>
  );
};

export default InvoiceHeader;
