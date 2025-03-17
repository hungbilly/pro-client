
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getJob, getClient, getJobInvoices, deleteJob } from '@/lib/storage';
import { Job, Client, Invoice } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Trash2, FileEdit, CalendarDays, MapPin, FileText, User, Mail, Phone, Pencil, Send } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import InvoiceList from '@/components/InvoiceList';

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | undefined>(undefined);
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      toast.error('Job ID is missing.');
      navigate('/');
      return;
    }

    const fetchJobData = async () => {
      setIsLoading(true);
      try {
        const fetchedJob = await getJob(id);
        if (fetchedJob) {
          setJob(fetchedJob);
          
          // Fetch client data
          const fetchedClient = await getClient(fetchedJob.clientId);
          if (fetchedClient) {
            setClient(fetchedClient);
          } else {
            toast.error('Client not found.');
          }
          
          // Fetch invoices related to this job
          const fetchedInvoices = await getJobInvoices(id);
          setInvoices(fetchedInvoices);
        } else {
          toast.error('Job not found.');
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to fetch job data:', error);
        toast.error('Failed to load job data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobData();
  }, [id, navigate]);

  const handleDeleteJob = async () => {
    try {
      if (id && job) {
        await deleteJob(id);
        toast.success('Job deleted successfully.');
        navigate(`/client/${job.clientId}`);
      } else {
        toast.error('Job ID is missing.');
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job.');
    }
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center p-8">Loading job data...</div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (!job || !client) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center p-8">Job or client not found.</div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-2xl font-bold">{job.title}</CardTitle>
              <div className="flex items-center mt-2">
                <Link to={`/client/${client.id}`} className="text-sm text-muted-foreground hover:underline">
                  {client.name}
                </Link>
                <Badge className={`ml-3 ${getStatusColor(job.status)}`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/client/${client.id}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Client
              </Button>
              <Button size="sm" asChild>
                <Link to={`/client/${client.id}/job/edit/${job.id}`}>
                  <FileEdit className="h-4 w-4 mr-2" />
                  Edit Job
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Job
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. All data associated with this job will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteJob}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div>
                <h3 className="text-lg font-medium">Job Details</h3>
                <CardDescription>
                  View and manage job information.
                </CardDescription>
                <Separator className="my-4" />
                
                {job.description && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-1">Description</h4>
                    <p className="text-sm">{job.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {job.date && (
                    <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 text-muted-foreground mr-2" />
                      <span>Date: {new Date(job.date).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {job.location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                      <span>Location: {job.location}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Client information section */}
              <div>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-medium">Client</h3>
                </div>
                <Separator className="my-4" />
                
                <Card className="border bg-card/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="text-xl font-semibold">{client.name}</h4>
                        <p className="text-sm text-muted-foreground">(Primary)</p>
                      </div>
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                        <span>{client.phone}</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-muted-foreground mr-2" />
                        <span>{client.email}</span>
                      </div>
                    </div>
                    
                    {client.notes && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <p className="text-sm">{client.notes}</p>
                        </div>
                      </>
                    )}
                    
                    <Separator className="my-4" />
                    
                    <div className="flex gap-3">
                      <Button variant="outline" className="w-full" asChild>
                        <Link to={`/client/${client.id}/edit`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Client
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Send className="h-4 w-4 mr-2" />
                        Send Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Separator className="my-2" />
              
              {/* Invoices section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Invoices</h3>
                  <Button asChild>
                    <Link to={`/job/${job.id}/invoice/create`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Link>
                  </Button>
                </div>
                
                {invoices.length === 0 ? (
                  <div className="bg-muted/50 rounded-lg p-6 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No invoices have been created for this job yet.</p>
                    <Button className="mt-4" asChild>
                      <Link to={`/job/${job.id}/invoice/create`}>
                        Create First Invoice
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <InvoiceList invoices={invoices} client={client} />
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <CardDescription>
              Created on {new Date(job.createdAt).toLocaleDateString()}
              {job.updatedAt && job.updatedAt !== job.createdAt && 
                ` • Last updated on ${new Date(job.updatedAt).toLocaleDateString()}`
              }
            </CardDescription>
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
};

export default JobDetail;
