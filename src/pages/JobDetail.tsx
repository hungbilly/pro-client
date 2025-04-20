import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Job, Client, Invoice } from '@/types';
import { getJob, getClient, deleteJob, getInvoices } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Pencil, MapPin, Trash2, FileEdit, CircleDollarSign, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCompany } from '@/components/CompanySelector';
import JobForm from '@/components/JobForm';
import InvoiceList from '@/components/InvoiceList';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      if (!id) return null;
      return await getJob(id);
    },
    enabled: !!id
  });

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', job?.clientId],
    queryFn: async () => {
      if (!job?.clientId) return null;
      return await getClient(job.clientId);
    },
    enabled: !!job?.clientId
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['job-invoices', id],
    queryFn: async () => {
      if (!id || !selectedCompany?.id) return [];
      const allInvoices = await getInvoices(selectedCompany.id);
      return allInvoices.filter(invoice => invoice.jobId === id);
    },
    enabled: !!id && !!selectedCompany?.id
  });

  const handleDelete = async () => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await deleteJob(id);
      toast.success('Job deleted successfully');
      navigate('/');
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  const getStatusBadge = (status: Job['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Cancelled</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (isEditing && job && client) {
    return <JobForm job={job} clientId={client.id} onSuccess={() => setIsEditing(false)} />;
  }

  if (jobLoading || clientLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading job details...</div>
      </div>
    );
  }

  if (!job || !client) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Job not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{job.title}</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteConfirmation(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <Badge className="mr-2">{getStatusBadge(job.status)}</Badge>
              </div>
              
              {job.date && (
                <div className="flex items-center">
                  <CalendarDays className="h-5 w-5 mr-2 text-gray-500" />
                  <span>
                    {format(new Date(job.date), 'MMMM d, yyyy')}
                    {job.isFullDay ? ' (Full Day)' : 
                      job.startTime && job.endTime ? 
                        ` (${job.startTime} - ${job.endTime})` : 
                        ''
                    }
                  </span>
                </div>
              )}
              
              {job.location && (
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-gray-500" />
                  <span>{job.location}</span>
                </div>
              )}
              
              {job.description && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="text-center py-4">Loading invoices...</div>
              ) : (
                <InvoiceList 
                  invoices={invoices} 
                  client={client}
                  showCreateButton={true}
                />
              )}
            </CardContent>
            <CardFooter>
              <Button asChild>
                <a href={`/invoice/create/${client.id}?jobId=${job.id}`}>
                  <FileEdit className="h-4 w-4 mr-2" />
                  Create Invoice
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">{client.name}</h3>
              </div>
              
              {client.email && (
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-500" />
                  <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                    {client.email}
                  </a>
                </div>
              )}
              
              {client.phone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-500" />
                  <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                    {client.phone}
                  </a>
                </div>
              )}
              
              {client.address && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{client.address}</span>
                </div>
              )}
              
              <Button variant="outline" className="w-full" asChild>
                <a href={`/client/${client.id}`}>
                  View Client Profile
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <a href={`/invoice/create/${client.id}?jobId=${job.id}`}>
                  <CircleDollarSign className="h-4 w-4 mr-2" />
                  Create Invoice
                </a>
              </Button>
              <Button variant="outline" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Add to Calendar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the job
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JobDetail;
