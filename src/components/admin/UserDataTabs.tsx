
import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, User, Briefcase, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface UserDataTabsProps {
  userId: string;
}

interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  is_default: boolean;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company_id: string;
  created_at: string;
}

interface Job {
  id: string;
  title: string;
  client_id: string;
  status: string;
  company_id: string;
  date?: string;
  created_at: string;
}

interface Invoice {
  id: string;
  client_id: string;
  number: string;
  amount: number;
  status: string;
  date: string;
  due_date: string;
  company_id: string;
}

const UserDataTabs = ({ userId }: UserDataTabsProps) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No active session');
        }

        const { data, error } = await supabase.functions.invoke('admin-get-user-data', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: { userId },
        });

        if (error) {
          throw error;
        }

        if (data) {
          setCompanies(data.companies || []);
          setClients(data.clients || []);
          setJobs(data.jobs || []);
          setInvoices(data.invoices || []);
        }
      } catch (error: any) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  if (!userId) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Select a user to view their data
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          Loading user data...
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="companies" className="w-full">
      <TabsList className="grid grid-cols-4 mb-4">
        <TabsTrigger value="companies">
          <Building className="h-4 w-4 mr-2" />
          Companies ({companies.length})
        </TabsTrigger>
        <TabsTrigger value="clients">
          <User className="h-4 w-4 mr-2" />
          Clients ({clients.length})
        </TabsTrigger>
        <TabsTrigger value="jobs">
          <Briefcase className="h-4 w-4 mr-2" />
          Jobs ({jobs.length})
        </TabsTrigger>
        <TabsTrigger value="invoices">
          <FileText className="h-4 w-4 mr-2" />
          Invoices ({invoices.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="companies">
        <Card>
          <CardHeader>
            <CardTitle>Companies</CardTitle>
            <CardDescription>List of companies created by this user</CardDescription>
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No companies found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.email || '-'}</TableCell>
                        <TableCell>{company.phone || '-'}</TableCell>
                        <TableCell>{company.address || '-'}</TableCell>
                        <TableCell>{company.is_default ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{formatDate(company.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="clients">
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>All clients associated with this user's companies</CardDescription>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No clients found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => {
                      const company = companies.find(c => c.id === client.company_id);
                      return (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.email || '-'}</TableCell>
                          <TableCell>{client.phone || '-'}</TableCell>
                          <TableCell>{client.address || '-'}</TableCell>
                          <TableCell>{company?.name || client.company_id}</TableCell>
                          <TableCell>{formatDate(client.created_at)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="jobs">
        <Card>
          <CardHeader>
            <CardTitle>Jobs</CardTitle>
            <CardDescription>All jobs associated with this user's companies</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No jobs found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => {
                      const company = companies.find(c => c.id === job.company_id);
                      const client = clients.find(c => c.id === job.client_id);
                      return (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">{job.title}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              job.status === 'active' ? 'bg-green-100 text-green-800' : 
                              job.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {job.status}
                            </span>
                          </TableCell>
                          <TableCell>{job.date || '-'}</TableCell>
                          <TableCell>{company?.name || '-'}</TableCell>
                          <TableCell>{client?.name || '-'}</TableCell>
                          <TableCell>{formatDate(job.created_at)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="invoices">
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>All invoices associated with this user's companies</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No invoices found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Company</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const company = companies.find(c => c.id === invoice.company_id);
                      const client = clients.find(c => c.id === invoice.client_id);
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.number}</TableCell>
                          <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                              invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' : 
                              invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {invoice.status}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(invoice.date)}</TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell>{client?.name || '-'}</TableCell>
                          <TableCell>{company?.name || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default UserDataTabs;
