
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClients, getInvoices, getJobs } from '@/lib/storage';
import { Client, Invoice } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { UserPlus, FileText, Users, CircleDollarSign, BarChart4, Clock, Briefcase, FilePlus } from 'lucide-react';
import ClientCard from './ClientCard';
import { AnimatedBackground } from './ui-custom/AnimatedBackground';
import JobList from './JobList';
import InvoiceList from './InvoiceList';

const Dashboard: React.FC = () => {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: getInvoices
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: getJobs
  });

  // Calculate stats
  const stats = {
    totalClients: clients.length,
    totalJobs: jobs.length,
    totalInvoices: invoices.length,
    totalAmount: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    pendingAmount: invoices
      .filter(inv => ['sent', 'accepted'].includes(inv.status))
      .reduce((sum, invoice) => sum + invoice.amount, 0),
    paidAmount: invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.amount, 0),
  };

  // Sort clients by newest first
  const sortedClients = [...clients].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Recent invoices (top 5)
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Upcoming invoices (due in the next 30 days)
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  
  const upcomingInvoices = invoices
    .filter(invoice => 
      ['sent', 'accepted'].includes(invoice.status) && 
      new Date(invoice.dueDate) <= thirtyDaysFromNow
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <AnimatedBackground className="py-6">
      <div className="container px-4 mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold mb-3 md:mb-0">Wedding Client Management</h1>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/client/new">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Client
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft hover:shadow-glow transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/20 mr-4">
                <Users className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <h3 className="text-2xl font-bold">{stats.totalClients}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft hover:shadow-glow transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="rounded-full p-3 bg-purple-100 dark:bg-purple-900/20 mr-4">
                <Briefcase className="h-5 w-5 text-purple-700 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                <h3 className="text-2xl font-bold">{stats.totalJobs}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft hover:shadow-glow transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="rounded-full p-3 bg-amber-100 dark:bg-amber-900/20 mr-4">
                <Clock className="h-5 w-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <h3 className="text-2xl font-bold">${stats.pendingAmount.toFixed(2)}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft hover:shadow-glow transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="rounded-full p-3 bg-green-100 dark:bg-green-900/20 mr-4">
                <CircleDollarSign className="h-5 w-5 text-green-700 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <h3 className="text-2xl font-bold">${stats.paidAmount.toFixed(2)}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content with tabs */}
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
              
              {/* Clients Tab Content */}
              <TabsContent value="clients">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Your Clients</h2>
                  <Button asChild size="sm">
                    <Link to="/client/new">
                      <UserPlus className="h-4 w-4 mr-2" />
                      New Client
                    </Link>
                  </Button>
                </div>
                
                {clients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Clients Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      You haven't added any clients yet. Add your first client to get started.
                    </p>
                    <Button asChild>
                      <Link to="/client/new">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add First Client
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedClients.map((client) => (
                      <ClientCard key={client.id} client={client} compact />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              {/* Jobs Tab Content */}
              <TabsContent value="jobs">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Current Jobs</h2>
                  {clients.length > 0 && (
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/client/${clients[0].id}`}>
                          View Client Details
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
                
                {jobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Jobs Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      You haven't created any jobs yet. Select a client to create your first job.
                    </p>
                    {clients.length > 0 && (
                      <Button asChild>
                        <Link to={`/client/${clients[0].id}`}>
                          Select a Client
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <JobList jobs={jobs} clients={clients} />
                )}
              </TabsContent>
              
              {/* Invoices Tab Content */}
              <TabsContent value="invoices">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Your Invoices</h2>
                  {jobs.length > 0 && (
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/job/${jobs[0].id}`}>
                          View Job Details
                        </Link>
                      </Button>
                    </div>
                  )}
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
                ) : (
                  <InvoiceList invoices={invoices} clients={clients} />
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
