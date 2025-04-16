
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import JobForm from '@/components/JobForm';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';
import ClientSelector from '@/components/ClientSelector';
import { Card, CardContent } from '@/components/ui/card';
import { User, Mail, Phone } from 'lucide-react';
import { getClient } from '@/lib/storage';
import { Client } from '@/types';

const JobCreate = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(!!clientId);

  useEffect(() => {
    const fetchClient = async () => {
      if (clientId) {
        try {
          const clientData = await getClient(clientId);
          setClient(clientData);
        } catch (error) {
          console.error('Failed to fetch client:', error);
          toast.error('Failed to load client data');
        } finally {
          setLoading(false);
        }
      }
    };

    if (clientId) {
      fetchClient();
    }
  }, [clientId]);

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    // Fetch the client data for display
    getClient(clientId).then(clientData => {
      setClient(clientData);
    }).catch(error => {
      console.error('Failed to fetch client after selection:', error);
    });
  };

  const handleJobSuccess = (jobId: string) => {
    setIsSubmitting(false);
    // Navigate to the job details page instead of the client page
    navigate(`/job/${jobId}`);
  };

  // Breadcrumb paths for navigation context
  const getBreadcrumbPaths = () => {
    const paths = [
      { label: "Dashboard", path: "/" },
    ];
    
    if (client) {
      paths.push({ label: "Clients", path: "/clients" });
      paths.push({ label: client.name, path: `/client/${client.id}` });
    } else {
      paths.push({ label: "Jobs", path: "/jobs" });
    }
    
    paths.push({ label: "New Job", path: "#" });
    
    return paths;
  };
  
  const paths = getBreadcrumbPaths();

  if (loading) {
    return (
      <PageTransition>
        <div className="container py-8 flex justify-center items-center">
          <div>Loading client data...</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <div className="flex flex-col space-y-2 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Create New Job</h1>
          <div className="text-sm text-muted-foreground flex items-center">
            {paths.map((path, index) => (
              <React.Fragment key={path.path}>
                {index > 0 && <span className="mx-1">{'>'}</span>}
                {path.path === '#' ? (
                  <span>{path.label}</span>
                ) : (
                  <span 
                    className="hover:underline cursor-pointer" 
                    onClick={() => navigate(path.path)}
                  >
                    {path.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        <div className="mb-8 max-w-4xl mx-auto">
          {!clientId && (
            <ClientSelector
              selectedClientId={selectedClientId || undefined}
              onClientSelect={handleClientSelect}
              className="mb-6"
            />
          )}
        </div>
        
        {/* Client Information Card */}
        {client && (
          <div className="mb-6 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <h2 className="font-semibold mb-4">Client</h2>
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{client.name}</span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4" />
                    <span>{client.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {(selectedClientId || clientId) ? (
          <JobForm 
            clientId={selectedClientId || clientId || ''} 
            onSuccess={handleJobSuccess}
          />
        ) : (
          <Card className="max-w-4xl mx-auto">
            <CardContent className="py-6">
              <p className="text-center text-muted-foreground">Please select a client to continue</p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
};

export default JobCreate;
