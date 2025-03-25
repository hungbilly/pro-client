
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClient, getClientInvoices, deleteClient, getClientJobs } from '@/lib/storage';
import { Client, Invoice, Job } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import InvoiceList from '@/components/InvoiceList';
import JobList from '@/components/JobList';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Trash2, UserCog, FileText } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { supabase } from '@/integrations/supabase/client';

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingStatic, setIsGeneratingStatic] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id) {
      toast.error('Client ID is missing.');
      navigate('/');
      return;
    }

    const fetchClientData = async () => {
      setIsLoading(true);
      try {
        const fetchedClient = await getClient(id);
        if (fetchedClient) {
          setClient(fetchedClient);
          
          const fetchedInvoices = await getClientInvoices(id);
          setInvoices(fetchedInvoices);
          
          const fetchedJobs = await getClientJobs(id);
          setJobs(fetchedJobs);
        } else {
          toast.error('Client not found.');
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to fetch client data:', error);
        toast.error('Failed to load client data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [id, navigate]);

  const handleDeleteClient = async () => {
    try {
      if (id) {
        await deleteClient(id);
        toast.success('Client deleted successfully.');
        navigate('/');
      } else {
        toast.error('Client ID is missing.');
      }
    } catch (error) {
      console.error('Failed to delete client:', error);
      toast.error('Failed to delete client.');
    }
  };

  const handleJobDelete = (jobId: string) => {
    setJobs(jobs.filter(job => job.id !== jobId));
  };

  const handleGenerateStaticHTML = async (invoiceId: string) => {
    setIsGeneratingStatic(prev => ({ ...prev, [invoiceId]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-static-invoice', {
        body: { invoiceId }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success('Static HTML version of invoice generated successfully');
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error generating static invoice:', error);
      toast.error('Failed to generate static HTML version of invoice');
    } finally {
      setIsGeneratingStatic(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  // Custom InvoiceActions component with static HTML generation
  const InvoiceActions = ({ invoice }: { invoice: Invoice }) => {
    return (
      <div className="flex space-x-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleGenerateStaticHTML(invoice.id)}
          disabled={isGeneratingStatic[invoice.id]}
        >
          {isGeneratingStatic[invoice.id] ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </span>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generate Static HTML
            </>
          )}
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <PageTransition>
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center p-8">Loading client data...</div>
          </CardContent>
        </Card>
      </PageTransition>
    );
  }

  if (!client) {
    return (
      <PageTransition>
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center p-8">Client not found.</div>
          </CardContent>
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">{client.name}</CardTitle>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
            <Button size="sm" asChild>
              <Link to={`/client/${client.id}/edit`}>
                <UserCog className="h-4 w-4 mr-2" />
                Edit Client
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Client
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All data associated with this client will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteClient}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <h3 className="text-lg font-medium">Client Information</h3>
              <CardDescription>
                View and manage client details.
              </CardDescription>
              <Separator className="my-4" />
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Email:</span> {client.email}
                </p>
                <p>
                  <span className="font-semibold">Phone:</span> {client.phone}
                </p>
                <p>
                  <span className="font-semibold">Address:</span> {client.address}
                </p>
                <p>
                  <span className="font-semibold">Created At:</span> {new Date(client.createdAt).toLocaleDateString()}
                </p>
                {client.notes && (
                  <p>
                    <span className="font-semibold">Notes:</span> {client.notes}
                  </p>
                )}
              </div>
            </div>
            <Separator className="my-4" />
            <JobList jobs={jobs} client={client} onJobDelete={handleJobDelete} />
            <Separator className="my-4" />
            <InvoiceList 
              invoices={invoices} 
              client={client} 
              showCreateButton={false} 
              extraActions={InvoiceActions}  // Pass our custom actions component
            />
          </div>
        </CardContent>
        <CardFooter>
          <CardDescription>
            Manage client details, jobs and invoices.
          </CardDescription>
        </CardFooter>
      </Card>
    </PageTransition>
  );
};

export default ClientDetail;
