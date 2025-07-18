
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
import { ArrowLeft, Trash2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useIsMobile } from '@/hooks/use-mobile';

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

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

  if (isLoading) {
    return (
      <PageTransition>
        <Card className="w-full max-w-6xl mx-auto">
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
        <Card className="w-full max-w-6xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center p-8">Client not found.</div>
          </CardContent>
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">{client.name}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
          </div>
          
          <div className={`flex gap-2 ${isMobile ? 'flex-wrap' : 'space-x-2'}`}>
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
                  <AlertDialogTitle>
                    Are you sure you want to delete {client?.name}?
                  </AlertDialogTitle>
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
          <div className="grid gap-4 overflow-hidden">
            <div>
              <h3 className="text-lg font-medium">Client Information</h3>
              <CardDescription>
                View and manage client details.
              </CardDescription>
              <Separator className="my-4" />
              <div className="space-y-2">
                {client.company && (
                  <p>
                    <span className="font-semibold">Company:</span> {client.company}
                  </p>
                )}
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
            <div className="overflow-hidden">
              <InvoiceList invoices={invoices} client={client} showCreateButton={false} />
            </div>
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
