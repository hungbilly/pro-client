
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Receipt, FileText } from 'lucide-react';

const InvoicesEmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">No Invoices Yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        You haven't created any invoices yet. Create your first invoice to get started.
      </p>
      <Button asChild>
        <Link to="/client/new/invoice/create">
          <FileText className="mr-2 h-4 w-4" />
          <span>Create Invoice</span>
        </Link>
      </Button>
    </div>
  );
};

export default InvoicesEmptyState;
