
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClients, getInvoices } from '@/lib/storage';
import { Client, Invoice } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { UserPlus, FileText, Users, CircleDollarSign, BarChart4, Clock } from 'lucide-react';
import ClientCard from './ClientCard';
import { AnimatedBackground } from './ui-custom/AnimatedBackground';

const Dashboard: React.FC = () => {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: getInvoices
  });

  // Calculate stats
  const stats = {
    totalClients: clients.length,
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
                <FileText className="h-5 w-5 text-purple-700 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                <h3 className="text-2xl font-bold">{stats.totalInvoices}</h3>
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

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Clients list */}
          <div className="lg:col-span-2">
            <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle>Clients</CardTitle>
                  <CardDescription>Manage your wedding clients</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/clients">View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {sortedClients.slice(0, 6).map((client) => (
                      <ClientCard key={client.id} client={client} compact />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Invoices overview */}
          <div>
            <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
              <CardHeader>
                <CardTitle>Invoices Overview</CardTitle>
                <CardDescription>Recent & upcoming invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upcoming" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upcoming" className="space-y-4">
                    {upcomingInvoices.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No upcoming invoices</p>
                      </div>
                    ) : (
                      upcomingInvoices.slice(0, 5).map((invoice) => {
                        const client = clients.find(c => c.id === invoice.clientId);
                        const daysUntilDue = Math.ceil(
                          (new Date(invoice.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                        );
                        
                        return (
                          <Link 
                            key={invoice.id} 
                            to={`/invoice/${invoice.id}`}
                            className="block"
                          >
                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                              <div>
                                <p className="font-medium">{client?.name || 'Unknown Client'}</p>
                                <p className="text-sm text-muted-foreground">{invoice.number}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">${invoice.amount.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                  Due in {daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'}
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </TabsContent>
                  
                  <TabsContent value="recent" className="space-y-4">
                    {recentInvoices.length === 0 ? (
                      <div className="text-center py-8">
                        <BarChart4 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No invoices created yet</p>
                      </div>
                    ) : (
                      recentInvoices.map((invoice) => {
                        const client = clients.find(c => c.id === invoice.clientId);
                        
                        return (
                          <Link 
                            key={invoice.id} 
                            to={`/invoice/${invoice.id}`}
                            className="block"
                          >
                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                              <div>
                                <p className="font-medium">{client?.name || 'Unknown Client'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(invoice.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">${invoice.amount.toFixed(2)}</p>
                                <p className="text-xs">
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    invoice.status === 'paid' 
                                      ? 'bg-green-100 text-green-800' 
                                      : invoice.status === 'accepted'
                                      ? 'bg-blue-100 text-blue-800'
                                      : invoice.status === 'sent'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default Dashboard;
