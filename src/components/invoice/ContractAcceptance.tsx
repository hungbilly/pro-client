
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types';

interface ContractAcceptanceProps {
  invoice: Invoice;
  isClientView: boolean;
  showContractDetails: boolean;
  onToggleContractDetails: () => void;
  onContractAccepted: (acceptedBy: string) => void;
}

const ContractAcceptance: React.FC<ContractAcceptanceProps> = ({
  invoice,
  isClientView,
  showContractDetails,
  onToggleContractDetails,
  onContractAccepted,
}) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name to accept the contract");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update the invoice in the database
      const { error } = await supabase
        .from('invoices')
        .update({
          contract_status: 'accepted',
          contract_accepted_at: new Date().toISOString(),
          invoice_accepted_by: name.trim()
        })
        .eq('id', invoice.id);

      if (error) {
        console.error('Error accepting contract:', error);
        toast.error('Failed to accept contract');
        return;
      }

      // Call the callback to update the local state
      onContractAccepted(name.trim());
      toast.success('Contract accepted successfully!');
      setName("");
    } catch (error) {
      console.error('Error accepting contract:', error);
      toast.error('Failed to accept contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isContractAccepted = invoice.contractStatus === 'accepted' || invoice.invoice_accepted_by;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Contract Terms
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleContractDetails}
          >
            {showContractDetails ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Details
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show Details
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showContractDetails && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {invoice.contractTerms}
            </div>
          </div>
        )}

        {isContractAccepted ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-green-800">
              <Check className="h-5 w-5" />
              <span className="font-medium">Contract Accepted</span>
            </div>
            <div className="mt-2 text-sm text-green-700">
              Accepted by: <span className="font-medium">{invoice.invoice_accepted_by}</span>
              {invoice.contract_accepted_at && (
                <div className="mt-1">
                  On: {new Date(invoice.contract_accepted_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ) : isClientView ? (
          <div className="space-y-4">
            <div className="text-sm">
              I confirm that I have read and understood this contract, and I agree to enter into this contract.
            </div>
            
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Type your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-md"
              />
              <Button 
                onClick={handleAccept}
                disabled={!name.trim() || isSubmitting}
              >
                <Check className="h-4 w-4 mr-2" />
                Accept Contract
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-gray-600">
            Waiting for client to accept the contract terms.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractAcceptance;
