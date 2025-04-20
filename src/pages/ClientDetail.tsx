import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Client, Job, Invoice } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileText, Mail, Phone, MapPin, Globe, User, Building2, FileEdit, Trash2, ArrowLeft } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import JobList from '@/components/JobList';
import InvoiceList from '@/components/InvoiceList';
import { getClient, updateClient, deleteClient, getClientInvoices, getClientJobs } from '@/lib/storage';
import { useCompany } from '@/components/CompanySelector';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const { selectedCompany } = useCompany();

  const { data: client, isLoading: isLoadingClient, isError: isErrorClient } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      if (!id) return null;
      return await getClient(id);
    },
    enabled: !!id,
  });

  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ['client-jobs', id],
    queryFn: async () => {
      if (!id) return [];
      return await getClientJobs(id);
    },
    enabled: !!id,
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['client-invoices', id],
    queryFn: async () => {
      if (!id) return [];
      return await getClientInvoices(id);
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (client) {
      setName(client.name);
      setEmail(client.email);
      setPhone(client.phone);
      setAddress(client.address);
      setNotes(client.notes || '');
    }
  }, [client]);

  const updateClientMutation = useMutation({
    mutationFn: async (updatedClient: Client) => {
      return await updateClient(updatedClient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      setIsEditing(false);
      toast.success('Client updated successfully.');
    },
    onError: () => {
      toast.error('Failed to update client.');
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return await deleteClient(clientId);
    },
    onSuccess: () => {
      toast.success('Client deleted successfully.');
      navigate('/clients');
    },
    onError: () => {
      toast.error('Failed to delete client.');
    },
  });

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    if (client) {
      setName(client.name);
      setEmail(client.email);
      setPhone(client.phone);
      setAddress(client.address);
      setNotes(client.notes || '');
    }
  };

  const handleSaveClick = async () => {
    if (!client) return;

    const updatedClient: Client = {
      ...client,
      name,
      email,
      phone,
      address,
      notes,
    };

    updateClientMutation.mutate(updatedClient);
  };

  const handleDeleteClick = () => {
    if (!id) return;
    deleteClientMutation.mutate(id);
  };

  const handleJobDeleted = (jobId: string) => {
    queryClient.invalidateQueries({ queryKey: ['client-jobs', id] });
  };

  const getClientInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (isLoadingClient) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center p-8">Loading client data...</div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (isErrorClient || !client) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center p-8">Client not found.</div>
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
              <CardTitle className="text-2xl font-bold">{client?.name}</CardTitle>
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/clients')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
              {!isEditing ? (
                <>
                  <Button variant="outline" size="icon" onClick={handleEditClick} title="Edit Client">
                    <FileEdit className="h-4 w-4" />
                    <span className="sr-only">Edit Client</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" title="Delete Client">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Client</span>
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
                        <AlertDialogAction onClick={handleDeleteClick}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <Button variant="secondary" size="sm" onClick={handleCancelClick}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveClick} disabled={updateClientMutation.isPending}>
                    {updateClientMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h3 className="text-md font-medium flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Client Information
                  </h3>
                  
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Company</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{client.name}</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Email</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <a href={`mailto:${client.email}`} className="hover:underline">
                            {client.email}
                          </a>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Phone</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <a href={`tel:${client.phone}`} className="hover:underline">
                            {client.phone}
                          </a>
                        </div>
                      </div>
                      
                      {client.address && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Address</div>
                          <div className="mt-0.5">
                            {client.address}
                          </div>
                        </div>
                      )}
                      
                      {client.notes && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Notes</div>
                          <div className="mt-0.5 text-sm line-clamp-3">
                            {client.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium">Additional Information</h3>
                  <CardDescription>
                    View and manage client information.
                  </CardDescription>
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-muted-foreground mr-2" />
                      <span>Email: {client.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                      <span>Phone: {client.phone}</span>
                    </div>
                    {client.address && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                        <span>Address: {client.address}</span>
                      </div>
                    )}
                    {client.notes && (
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 text-muted-foreground mr-2" />
                        <span>Notes: {client.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Jobs</h3>
                  <Button asChild>
                    <Link to={`/client/${client.id}/job/new`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Job
                    </Link>
                  </Button>
                </div>
                
                {isLoadingJobs ? (
                  <div className="text-center p-4">Loading jobs...</div>
                ) : (
                  <JobList jobs={jobs} onJobDelete={handleJobDeleted} />
                )}
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Invoices</h3>
                  <Button asChild>
                    <Link to={`/client/${client.id}/invoice/new`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Link>
                  </Button>
                </div>
                
                {isLoadingInvoices ? (
                  <div className="text-center p-4">Loading invoices...</div>
                ) : (
                  <InvoiceList 
                    invoices={invoices} 
                    showCreateButton={false}
                    client={client}
                  />
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <CardDescription>
              Created on {new Date(client.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
};

export default ClientDetail;
