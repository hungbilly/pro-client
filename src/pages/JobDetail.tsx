import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getJob, getClient, getJobInvoices, deleteJob } from '@/lib/storage';
import { Job, Client, Invoice } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Trash2, FileEdit, CalendarDays, MapPin, FileText, User, Mail, Phone, Pencil, Send, Building, Clock } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import InvoiceList from '@/components/InvoiceList';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
          
          const fetchedClient = await getClient(fetchedJob.clientId);
          if (fetchedClient) {
            setClient(fetchedClient);
          } else {
            toast.error('Client not found.');
          }
          
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
          <div className="text-center p-8">Loading job data...</div>
        </div>
      </PageTransition>
    );
  }

  if (!job || !client) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <div className="text-center p-8">Job or client not found.</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-full" 
              onClick={() => navigate(`/client/${client.id}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <Badge className={`ml-2 ${getStatusColor(job.status)}`}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/job/${job.id}/edit`}>
                      <FileEdit className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Job</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
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
                </TooltipTrigger>
                <TooltipContent>Delete Job</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="bg-muted/30 pb-2">
              <div className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Job Details</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                {/* Job Details Section */}
                <div className="lg:col-span-4 space-y-4">
                  {job.description && (
                    <div className="mb-4">
                      <p className="text-sm">{job.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {job.date && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{new Date(job.date).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    {job.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{job.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Created {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Client Information Section */}
                <div className="lg:col-span-3">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Client Information</h3>
                    </div>
                    
                    <Separator className="mb-4" />
                    
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-grow">
                        <h4 className="font-semibold">{client.name}</h4>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{client.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{client.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {client.notes && (
                      <div className="mt-3">
                        <h4 className="text-xs font-medium mb-1 text-muted-foreground">Notes</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{client.notes}</p>
                      </div>
                    )}
                    
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs" asChild>
                        <Link to={`/client/${client.id}/edit`}>
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Send className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="bg-muted/30 pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Invoices</CardTitle>
              </div>
              <Button size="sm" asChild>
                <Link to={`/job/${job.id}/invoice/create`}>
                  Create Invoice
                </Link>
              </Button>
            </CardHeader>
            
            <CardContent className="pt-4">
              {invoices.length === 0 ? (
                <div className="bg-muted/20 rounded-lg p-6 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">No invoices have been created for this job yet.</p>
                </div>
              ) : (
                <InvoiceList invoices={invoices} client={client} showCreateButton={false} showTitle={false} />
              )}
            </CardContent>
          </Card>
        </div>
        
        <CardFooter className="px-0 mt-6 opacity-70">
          <CardDescription>
            Created on {new Date(job.createdAt).toLocaleDateString()}
            {job.updatedAt && job.updatedAt !== job.createdAt && 
              ` • Last updated on ${new Date(job.updatedAt).toLocaleDateString()}`
            }
          </CardDescription>
        </CardFooter>
      </div>
    </PageTransition>
  );
};

export default JobDetail;
