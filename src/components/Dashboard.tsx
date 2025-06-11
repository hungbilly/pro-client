import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getClients, getInvoices, getJobs, deleteClient, getExpenses } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Briefcase, FileText } from 'lucide-react';
import { AnimatedBackground } from './ui-custom/AnimatedBackground';
import { toast } from 'sonner';
import { useCompany } from './CompanySelector';
import { supabase } from '@/integrations/supabase/client';
import { logDebug } from '@/integrations/supabase/client';
import CreateInvoiceModal from './ui-custom/CreateInvoiceModal';
import { useIsMobile } from '@/hooks/use-mobile';

// Import refactored components
import DashboardHeader from './dashboard/DashboardHeader';
import DashboardAnalytics from './dashboard/DashboardAnalytics';
import ClientsTabContent from './dashboard/ClientsTabContent';
import JobsTabContent from './dashboard/JobsTabContent';
import InvoicesTabContent from './dashboard/InvoicesTabContent';
import DeleteClientDialog from './dashboard/DeleteClientDialog';
import { getStatusColor } from './dashboard/StatusUtils';

const Dashboard: React.FC = () => {
  const [clientToDelete, setClientToDelete] = React.useState<string | null>(null);
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const [localInvoices, setLocalInvoices] = useState<any[]>([]);
  const [jobDates, setJobDates] = useState<Record<string, string>>({});
  const isMobile = useIsMobile();
  
  const {
    companies,
    selectedCompanyId,
    loading: companyLoading
  } = useCompany();

  useEffect(() => {
    if (selectedCompanyId) {
      queryClient.invalidateQueries({
        queryKey: ['clients', selectedCompanyId]
      });
      queryClient.invalidateQueries({
        queryKey: ['jobs', selectedCompanyId]
      });
      queryClient.invalidateQueries({
        queryKey: ['invoices', selectedCompanyId]
      });
      queryClient.invalidateQueries({
        queryKey: ['expenses', selectedCompanyId]
      });
    }
  }, [selectedCompanyId, queryClient]);

  useEffect(() => {
    if (isMobile) {
      // Force scroll to work by setting proper styles
      document.body.style.overflow = 'auto';
      document.body.style.height = 'auto';
      document.documentElement.style.height = 'auto';
      document.body.style.touchAction = 'auto';
      
      // Small delay to ensure DOM is ready after route change
      const timer = setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  const {
    data: clients = [],
    isLoading: clientsLoading
  } = useQuery({
    queryKey: ['clients', selectedCompanyId],
    queryFn: () => getClients(selectedCompanyId),
    enabled: !!selectedCompanyId
  });

  const fetchInvoicesWithSchedules = async (companyId: string) => {
    try {
      const {
        data: invoicesData,
        error: invoicesError
      } = await supabase.from('invoices').select('*').eq('company_id', companyId);
      if (invoicesError) {
        logDebug('Error fetching invoices:', invoicesError);
        return [];
      }
      const {
        data: schedulesData,
        error: schedulesError
      } = await supabase.from('payment_schedules').select('*');
      if (schedulesError) {
        logDebug('Error fetching payment schedules:', schedulesError);
        return [];
      }
      logDebug(`Fetched ${invoicesData.length} invoices and ${schedulesData.length} payment schedules`);
      const invoicesWithSchedules = invoicesData.map(invoice => {
        const invoiceSchedules = schedulesData.filter(schedule => schedule.invoice_id === invoice.id).map(schedule => ({
          id: schedule.id,
          dueDate: schedule.due_date,
          percentage: schedule.percentage,
          description: schedule.description || '',
          status: schedule.status || 'unpaid',
          paymentDate: schedule.payment_date
        }));
        if (invoiceSchedules.length > 0) {
          logDebug(`Invoice ${invoice.id} has ${invoiceSchedules.length} payment schedules`);
          logDebug('Sample schedule:', {
            id: invoiceSchedules[0].id,
            status: invoiceSchedules[0].status,
            dueDate: invoiceSchedules[0].dueDate,
            paymentDate: invoiceSchedules[0].paymentDate
          });
        }
        return {
          id: invoice.id,
          clientId: invoice.client_id,
          amount: invoice.amount,
          date: invoice.date,
          dueDate: invoice.due_date,
          number: invoice.number,
          status: invoice.status,
          notes: invoice.notes,
          jobId: invoice.job_id,
          companyId: invoice.company_id,
          contractStatus: invoice.contract_status,
          contractTerms: invoice.contract_terms,
          shootingDate: invoice.shooting_date,
          viewLink: invoice.view_link,
          paymentSchedules: invoiceSchedules
        };
      });
      
      logDebug('Processed invoices with schedules:', {
        totalInvoices: invoicesWithSchedules.length,
        sampleInvoice: invoicesWithSchedules.length > 0 ? {
          id: invoicesWithSchedules[0].id,
          paymentSchedulesCount: invoicesWithSchedules[0].paymentSchedules.length,
          scheduleStatuses: invoicesWithSchedules[0].paymentSchedules.map(s => s.status),
          paymentDates: invoicesWithSchedules[0].paymentSchedules.map(s => s.paymentDate)
        } : null
      });
      
      return invoicesWithSchedules;
    } catch (error) {
      logDebug('Unexpected error fetching invoices with schedules:', error);
      return [];
    }
  };

  const {
    data: invoices = [],
    isLoading: invoicesLoading
  } = useQuery({
    queryKey: ['invoices', selectedCompanyId],
    queryFn: () => selectedCompanyId ? fetchInvoicesWithSchedules(selectedCompanyId) : [],
    enabled: !!selectedCompanyId
  });

  React.useEffect(() => {
    setLocalInvoices(invoices);
  }, [invoices]);

  const {
    data: jobs = [],
    isLoading: jobsLoading
  } = useQuery({
    queryKey: ['jobs', selectedCompanyId],
    queryFn: () => getJobs(selectedCompanyId),
    enabled: !!selectedCompanyId
  });

  React.useEffect(() => {
    const dateMap: Record<string, string> = {};
    jobs.forEach(job => {
      if (job.id && job.date) {
        dateMap[job.id] = job.date;
      }
    });
    setJobDates(dateMap);
  }, [jobs]);

  const {
    data: expenses = [],
    isLoading: expensesLoading
  } = useQuery({
    queryKey: ['expenses', selectedCompanyId],
    queryFn: () => getExpenses(selectedCompanyId),
    enabled: !!selectedCompanyId
  });

  if (companyLoading) {
    return <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">Loading company data...</p>
        </div>
      </div>;
  }

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
      queryClient.invalidateQueries({
        queryKey: ['clients', selectedCompanyId]
      });
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
    }
  };

  const cancelDeleteClient = () => {
    setClientToDelete(null);
  };

  const getJobDateDisplay = (invoice: any) => {
    if (invoice.shootingDate) {
      return <span>{new Date(invoice.shootingDate).toLocaleDateString()}</span>;
    }
    if (invoice.jobId && jobDates[invoice.jobId]) {
      return <span>{new Date(jobDates[invoice.jobId]).toLocaleDateString()}</span>;
    }
    return <span className="text-muted-foreground text-sm">Not set</span>;
  };

  const handleOpenCreateInvoiceModal = () => {
    setIsCreateInvoiceModalOpen(true);
  };

  const handleCloseCreateInvoiceModal = () => {
    setIsCreateInvoiceModalOpen(false);
  };

  const handleInvoiceDeleted = (invoiceId: string) => {
    setLocalInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
  };

  const isLoading = clientsLoading || invoicesLoading || jobsLoading || expensesLoading;
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">Loading data...</p>
        </div>
      </div>;
  }

  // Get the client name for the delete dialog
  const clientToDeleteName = clientToDelete ? clients.find(c => c.id === clientToDelete)?.name : undefined;

  return (
    <div className={`relative ${isMobile ? 'mobile-scrollable' : ''}`}>
      {/* Soft muted Tiffany Blue Glassmorphism Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-200 via-gray-200 to-teal-200/60 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-100/40 via-slate-200/30 to-teal-100/30"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-3xl animate-pulse-soft"></div>
        <div className="absolute top-1/3 right-0 w-[28rem] h-[28rem] bg-teal-100/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gray-200/20 rounded-full blur-3xl animate-pulse-soft"></div>
        <div className="absolute top-1/2 left-1/2 w-56 h-56 bg-slate-100/20 rounded-full blur-2xl animate-float"></div>
      </div>

      <AnimatedBackground 
        className="py-6" 
        disableOverflowHidden={true}
      >
        <DeleteClientDialog 
          clientId={clientToDelete}
          clientName={clientToDeleteName}
          onClose={cancelDeleteClient}
          onConfirm={handleDeleteClient}
        />

        <div className="container px-4 mx-auto">
          <DashboardHeader hasCompanies={companies.length > 0} />
          
          {companies.length > 0 && (
            <>
              <DashboardAnalytics 
                invoices={invoices} 
                jobs={jobs} 
                expenses={expenses} 
              />

              <Card className="glass-card-enhanced shadow-glass-2xl border-white/30 backdrop-blur-xl bg-white/20">
                <CardHeader className="pb-4">
                  <CardTitle className="text-gray-900 font-bold">Manage Your Business</CardTitle>
                  <CardDescription className="text-gray-700 font-medium">View and manage clients, jobs, and invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="clients" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6 glass-panel-enhanced bg-white/20 border-white/30 backdrop-blur-md">
                      <TabsTrigger 
                        value="clients" 
                        className="flex items-center gap-2 text-slate-700 hover:bg-white/30 data-[state=active]:bg-white/40 data-[state=active]:text-slate-800 transition-all duration-300 font-medium backdrop-blur-sm"
                      >
                        <Users size={16} />
                        <span>Clients</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="jobs" 
                        className="flex items-center gap-2 text-gray-700 hover:bg-white/30 data-[state=active]:bg-white/40 data-[state=active]:text-gray-800 transition-all duration-300 font-medium backdrop-blur-sm"
                      >
                        <Briefcase size={16} />
                        <span>Jobs</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="invoices" 
                        className="flex items-center gap-2 text-slate-600 hover:bg-white/30 data-[state=active]:bg-white/40 data-[state=active]:text-slate-800 transition-all duration-300 font-medium backdrop-blur-sm"
                      >
                        <FileText size={16} />
                        <span>Invoices</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="clients">
                      <ClientsTabContent 
                        clients={clients}
                        onDeleteClient={confirmDeleteClient}
                      />
                    </TabsContent>
                    
                    <TabsContent value="jobs">
                      <JobsTabContent 
                        jobs={jobs}
                        clients={clients}
                        getStatusColor={getStatusColor}
                      />
                    </TabsContent>
                    
                    <TabsContent value="invoices">
                      <InvoicesTabContent 
                        invoices={localInvoices}
                        clients={clients}
                        jobs={jobs}
                        jobDates={jobDates}
                        getStatusColor={getStatusColor}
                        getJobDateDisplay={getJobDateDisplay}
                        onOpenCreateInvoiceModal={handleOpenCreateInvoiceModal}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </>
          )}
        </div>
        
        {/* Create Invoice Modal */}
        <CreateInvoiceModal 
          isOpen={isCreateInvoiceModalOpen} 
          onClose={handleCloseCreateInvoiceModal} 
        />
      </AnimatedBackground>
    </div>
  );
};

export default Dashboard;
