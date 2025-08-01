import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getJob, getClient, getJobInvoices, deleteJob } from '@/lib/storage';
import { Job, Client, Invoice } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Trash2, FileEdit, CalendarDays, MapPin, FileText, User, Building2, Mail, Phone, Clock } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import InvoiceList from '@/components/InvoiceList';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import JobTeammatesList from '@/components/teammates/JobTeammatesList';
import { getJobTeammates } from '@/lib/teammateStorage';

const JobDetail = () => {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [job, setJob] = useState<Job | undefined>(undefined);
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const {
    data: invoices = [],
    isLoading: isLoadingInvoices
  } = useQuery({
    queryKey: ['job-invoices', id],
    queryFn: async () => {
      if (!id) return [];
      return await getJobInvoices(id);
    },
    enabled: !!id
  });
  const {
    data: jobTeammates = [],
    isLoading: isLoadingTeammates
  } = useQuery({
    queryKey: ['job-teammates', id],
    queryFn: async () => {
      if (!id) return [];
      return await getJobTeammates(id);
    },
    enabled: !!id,
    refetchInterval: 300000
  });
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
  const getClientInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
  };
  const formatTimeDisplay = (job: Job) => {
    if (job.isFullDay) {
      return "Full Day";
    }
    if (job.startTime && job.endTime) {
      return `${job.startTime} - ${job.endTime}`;
    }
    return null;
  };
  const handleTeammateStatusRefreshed = () => {
    queryClient.invalidateQueries({
      queryKey: ['job-teammates', id]
    });
  };
  if (isLoading) {
    return <PageTransition>
        <div className="container mx-auto py-8">
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center p-8">Loading job data...</div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>;
  }
  if (!job || !client) {
    return <PageTransition>
        <div className="container mx-auto py-8">
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center p-8">Job or client not found.</div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>;
  }
  return <PageTransition>
      <div className="container mx-auto py-8 space-y-6">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex-1 space-y-4 min-w-0">
              {/* Job Title - More prominent */}
              <CardTitle className="text-2xl md:text-3xl font-bold break-words">{job.title}</CardTitle>
              
              {/* Client Information - Smaller and less prominent */}
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-6 w-6 bg-purple-100 flex-shrink-0">
                  <AvatarFallback className="text-purple-700 text-xs">
                    {getClientInitials(client.name)}
                  </AvatarFallback>
                </Avatar>
                <Link to={`/client/${client.id}`} className="text-sm font-medium text-purple-700 hover:underline break-words min-w-0 flex-1">
                  {client.name}
                </Link>
              </div>
              
              {/* Status Badge */}
              <div>
                <Badge className={`self-start ${getStatusColor(job.status)}`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </Badge>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="icon" asChild className="h-8 w-8 rounded-full" title="Edit Job">
                  <Link to={`/job/${job.id}/edit`}>
                    <FileEdit className="h-4 w-4" />
                    <span className="sr-only">Edit Job</span>
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full" title="Delete Job">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete Job</span>
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
            </div>
            
            {/* Back Button - Top Right */}
            <div className="ml-4 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => navigate(`/client/${client.id}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Client</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {/* Job Details - Main focus */}
              <div>
                <h3 className="text-xl font-semibold mb-2">Job Details</h3>
                <CardDescription className="mb-4">
                  View and manage job information.
                </CardDescription>
                <Separator className="mb-4" />
                
                {job.description && <div className="mb-4">
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                  </div>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {job.date && <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 text-muted-foreground mr-2" />
                      <div>
                        <span>Date: {new Date(job.date).toLocaleDateString()}</span>
                        {(job.startTime || job.isFullDay) && <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            <span>{formatTimeDisplay(job)}</span>
                          </div>}
                      </div>
                    </div>}
                  
                  {job.location && <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                      <span>Location: {job.location}</span>
                    </div>}
                </div>
              </div>

              {/* Client Information - Smaller and less prominent */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-md font-medium flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Client Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Name</div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span>{client.name}</span>
                    </div>
                  </div>
                  
                  {client.company && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Company</div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span>{client.company}</span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Email</div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <a href={`mailto:${client.email}`} className="hover:underline">
                        {client.email}
                      </a>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Phone</div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <a href={`tel:${client.phone}`} className="hover:underline">
                        {client.phone}
                      </a>
                    </div>
                  </div>
                  
                  {client.address && <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Address</div>
                      <div>
                        {client.address}
                      </div>
                    </div>}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <CardDescription>
              Created on {new Date(job.createdAt).toLocaleDateString()}
              {job.updatedAt && job.updatedAt !== job.createdAt && ` • Last updated on ${new Date(job.updatedAt).toLocaleDateString()}`}
            </CardDescription>
          </CardFooter>
        </Card>

        {/* Job Teammates Section */}
        <div className="w-full max-w-4xl mx-auto">
          <JobTeammatesList jobId={job.id} teammates={jobTeammates} onTeammateRemoved={handleTeammateStatusRefreshed} />
        </div>

        {/* Invoices Section */}
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Invoices</CardTitle>
              <Button asChild>
                <Link to={`/job/${job.id}/invoice/create`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Invoice
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? <div className="bg-muted/50 rounded-lg p-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No invoices have been created for this job yet.</p>
                <Button className="mt-4" asChild>
                  <Link to={`/job/${job.id}/invoice/create`}>
                    Create First Invoice
                  </Link>
                </Button>
              </div> : <InvoiceList invoices={invoices} client={client} showCreateButton={false} />}
          </CardContent>
        </Card>
      </div>
    </PageTransition>;
};
export default JobDetail;
