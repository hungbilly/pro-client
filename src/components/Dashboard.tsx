
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getClients, getInvoices, getJobs, deleteClient } from '@/lib/storage';
import { Client, Invoice } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, FileText, Users, Briefcase, FilePlus, Eye, FileEdit, MoreHorizontal, Trash2, Search } from 'lucide-react';
import { AnimatedBackground } from './ui-custom/AnimatedBackground';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useCompany } from './CompanySelector';
import AddClientButton from './ui-custom/AddClientButton';
import AddJobButton from './ui-custom/AddJobButton';
import RevenueChart from './RevenueChart';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [clientToDelete, setClientToDelete] = React.useState<string | null>(null);
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  
  const { companies, selectedCompanyId, loading: companyLoading } = useCompany();
  
  useEffect(() => {
    if (selectedCompanyId) {
      queryClient.invalidateQueries({ queryKey: ['clients', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['jobs', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', selectedCompanyId] });
    }
  }, [selectedCompanyId, queryClient]);

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients', selectedCompanyId],
    queryFn: () => getClients(selectedCompanyId),
    enabled: !!selectedCompanyId
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', selectedCompanyId],
    queryFn: () => getInvoices(selectedCompanyId),
    enabled: !!selectedCompanyId
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs', selectedCompanyId],
    queryFn: () => getJobs(selectedCompanyId),
    enabled: !!selectedCompanyId
  });

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">Loading company data...</p>
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold mb-4">Welcome to Wedding Studio Manager</h2>
          <p className="mb-6">To get started, you need to create a company first.</p>
          <Button asChild>
            <Link to="/settings">Create Your Company</Link>
          </Button>
        </div>
      </div>
    );
  }

  const sortedClients = [...clients]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter(client => 
      client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      client.phone.toLowerCase().includes(clientSearchQuery.toLowerCase())
    );
  
  const filteredJobs = [...jobs]
    .filter(job => 
      job.title.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
      clients.find(c => c.id === job.clientId)?.name.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
      (job.location && job.location.toLowerCase().includes(jobSearchQuery.toLowerCase()))
    );
  
  const filteredInvoices = [...invoices]
    .filter(invoice => 
      invoice.number.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
      clients.find(c => c.id === invoice.clientId)?.name.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
      invoice.status.toLowerCase().includes(invoiceSearchQuery.toLowerCase())
    );

  const handleClientRowClick = (clientId: string) => {
    navigate(`/client/${clientId}`);
  };

  const handleJobRowClick = (jobId: string) => {
    navigate(`/job/${jobId}`);
  };

  const handleInvoiceRowClick = (invoiceId: string) => {
    navigate(`/invoice/${invoiceId}`);
  };

  const confirmDeleteClient = (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    setClientToDelete(clientId);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    
    try {
      await deleteClient(clientToDelete);
      toast.success("Client deleted successfully");
      setClientToDelete(null);
      
      queryClient.invalidateQueries({ queryKey: ['clients', selectedCompanyId] });
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
    }
  };

  const cancelDeleteClient = () => {
    setClientToDelete(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
      case 'accepted':
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'draft':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isLoading = clientsLoading || invoicesLoading || jobsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatedBackground className="py-6">
      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this client?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client
              and all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteClient}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="container px-4 mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold mb-3 md:mb-0">Wedding Client Management</h1>
          <div className="flex flex-wrap gap-2">
            <AddClientButton />
          </div>
        </div>

        <div className="mb-8">
          <RevenueChart invoices={invoices} jobs={jobs} />
        </div>

        <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
          <CardHeader>
            <CardTitle>Manage Your Business</CardTitle>
            <CardDescription>View and manage clients, jobs, and invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="clients" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="clients" className="flex items-center gap-2">
                  <Users size={16} />
                  <span>Clients</span>
                </TabsTrigger>
                <TabsTrigger value="jobs" className="flex items-center gap-2">
                  <Briefcase size={16} />
                  <span>Jobs</span>
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-2">
                  <FileText size={16} />
                  <span>Invoices</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="clients">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Your Clients</h2>
                  <AddClientButton />
                </div>
                
                <div className="relative mb-4">
                  <Input
                    placeholder="Search clients by name, email, or phone..."
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
                
                {clients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Clients Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      You haven't added any clients yet. Add your first client to get started.
                    </p>
                    <AddClientButton />
                  </div>
                ) : sortedClients.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No clients match your search</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="hidden md:table-cell">Added On</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedClients.map((client) => (
                          <TableRow 
                            key={client.id} 
                            onClick={() => handleClientRowClick(client.id)}
                            className="cursor-pointer"
                          >
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell>{client.email}</TableCell>
                            <TableCell>{client.phone}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {new Date(client.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-popover">
                                    <DropdownMenuItem 
                                      onClick={() => navigate(`/client/${client.id}/job/create`)}
                                      className="cursor-pointer"
                                    >
                                      <Briefcase className="mr-2 h-4 w-4" />
                                      <span>Add Job</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => navigate(`/client/edit/${client.id}`)}
                                      className="cursor-pointer"
                                    >
                                      <FileEdit className="mr-2 h-4 w-4" />
                                      <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={(e) => confirmDeleteClient(e, client.id)}
                                      className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>Delete</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="jobs">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Current Jobs</h2>
                  {clients.length > 0 && (
                    <AddJobButton />
                  )}
                </div>
                
                <div className="relative mb-4">
                  <Input
                    placeholder="Search jobs by title, client name, or location..."
                    value={jobSearchQuery}
                    onChange={(e) => setJobSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
                
                {jobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Jobs Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      You haven't created any jobs yet. Select a client to create your first job.
                    </p>
                    {clients.length > 0 && (
                      <AddJobButton />
                    )}
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No jobs match your search</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="hidden md:table-cell">Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJobs.map((job) => {
                          const jobClient = clients.find((c) => c.id === job.clientId) || null;
                          return (
                            <TableRow 
                              key={job.id}
                              onClick={() => handleJobRowClick(job.id)}
                              className="cursor-pointer"
                            >
                              <TableCell className="font-medium">{job.title}</TableCell>
                              <TableCell>{jobClient?.name}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {job.date ? new Date(job.date).toLocaleDateString() : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(job.status)}>
                                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="outline" size="sm" asChild>
                                    <Link to={`/client/${job.clientId}/job/edit/${job.id}`}>
                                      <FileEdit className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="invoices">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Your Invoices</h2>
                  {jobs.length > 0 && (
                    <Button asChild size="sm">
                      <Link to={`/jobs`}>
                        View Jobs
                      </Link>
                    </Button>
                  )}
                </div>
                
                <div className="relative mb-4">
                  <Input
                    placeholder="Search invoices by number, client name, or status..."
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
                
                {invoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FilePlus className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Invoices Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      You haven't created any invoices yet. Select a job to create your first invoice.
                    </p>
                    {jobs.length > 0 && (
                      <Button asChild>
                        <Link to={`/job/${jobs[0].id}`}>
                          Select a Job
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No invoices match your search</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="hidden md:table-cell">Date</TableHead>
                          <TableHead className="hidden md:table-cell">Due Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.map((invoice) => {
                          const invoiceClient = clients.find((c) => c.id === invoice.clientId) || null;
                          return (
                            <TableRow 
                              key={invoice.id}
                              onClick={() => handleInvoiceRowClick(invoice.id)}
                              className="cursor-pointer"
                            >
                              <TableCell className="font-medium">{invoice.number}</TableCell>
                              <TableCell>{invoiceClient?.name}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {new Date(invoice.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {new Date(invoice.dueDate).toLocaleDateString()}
                              </TableCell>
                              <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(invoice.status)}>
                                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="outline" size="sm" asChild>
                                    <Link to={`/invoice/${invoice.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AnimatedBackground>
  );
};

export default Dashboard;
