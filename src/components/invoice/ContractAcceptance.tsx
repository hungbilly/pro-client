
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

interface ContractAcceptanceProps {
  companyName: string;
  onAccept: (name: string) => Promise<void>;
}

const ContractAcceptance: React.FC<ContractAcceptanceProps> = ({
  companyName,
  onAccept,
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
      await onAccept(name.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm">
        I confirm that I have read and understood this contract, and I agree to enter into this contract with {companyName}
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
  );
};

export default ContractAcceptance;
