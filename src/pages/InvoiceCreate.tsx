
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InvoiceForm from '@/components/InvoiceForm';
import PageTransition from '@/components/ui-custom/PageTransition';
import AnimatedBackground from '@/components/ui-custom/AnimatedBackground';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

const InvoiceCreate = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  
  if (!clientId) {
    navigate('/');
    return null;
  }

  return (
    <PageTransition>
      <AnimatedBackground>
        <div className="container px-4 py-8 mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6" 
            onClick={() => navigate(`/client/${clientId}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Client
          </Button>

          <InvoiceForm clientId={clientId} />
        </div>
      </AnimatedBackground>
    </PageTransition>
  );
};

export default InvoiceCreate;
