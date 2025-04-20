
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FileCheck } from 'lucide-react';
import { Invoice } from '@/types';

interface InvoiceStatusBadgesProps {
  invoice: Invoice;
}

const InvoiceStatusBadges: React.FC<InvoiceStatusBadgesProps> = ({ invoice }) => {
  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    paid: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };

  const contractStatusColor = invoice.contractStatus === 'accepted' 
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';

  return (
    <div className="mt-1 flex items-center">
      <Badge className={statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}>
        {invoice.status.toUpperCase()}
      </Badge>
      {invoice.contractStatus === 'accepted' && (
        <Badge variant="outline" className={`ml-2 flex items-center gap-1 ${contractStatusColor}`}>
          <FileCheck className="h-3 w-3" />
          Contract Accepted
        </Badge>
      )}
    </div>
  );
};

export default InvoiceStatusBadges;
