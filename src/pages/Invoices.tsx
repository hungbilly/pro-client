
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInvoices } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/ui-custom/PageTransition';
import SearchBox from '@/components/ui-custom/SearchBox';
import ExportDialog from '@/components/ExportDialog';
import { exportDataToFile, formatInvoicesForExport } from '@/utils/exportUtils';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import DateRangeFilter from '@/components/ui-custom/DateRangeFilter';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/context/CompanyContext';
import { sortInvoices, filterInvoices } from '@/utils/invoiceUtils';

// Import the new components
import InvoicesEmptyState from '@/components/invoices/InvoicesEmptyState';
import InvoicesTable from '@/components/invoices/InvoicesTable';
import InvoicesToolbar from '@/components/invoices/InvoicesToolbar';
import CreateInvoiceModal from '@/components/ui-custom/CreateInvoiceModal';
import { SortConfig } from '@/components/invoices/InvoicesTable';

const Invoices = () => {
  const { selectedCompany } = useCompanyContext();
  const selectedCompanyId = selectedCompany?.id;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const queryClient = useQueryClient();
  const [localInvoices, setLocalInvoices] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [jobDates, setJobDates] = useState<Record<string, string>>({});
  
  // Query to fetch invoices
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices', selectedCompanyId],
    queryFn: () => getInvoices(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  // Query to get all jobs for their dates
  const { data: allJobs = [] } = useQuery({
    queryKey: ['all-jobs', selectedCompanyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, date')
        .eq('company_id', selectedCompanyId);
      
      console.log('[Invoices] Fetched job dates:', data);
      return data || [];
    },
    enabled: !!selectedCompanyId,
  });

  // Set up job dates map from fetched jobs
  useEffect(() => {
    const jobDateMap: Record<string, string> = {};
    allJobs.forEach((job) => {
      if (job.id && job.date) {
        jobDateMap[job.id] = job.date;
      }
    });
    
    console.log('[Invoices] Job dates map:', jobDateMap);
    setJobDates(jobDateMap);
  }, [allJobs]);

  // Update local invoices when data changes
  useEffect(() => {
    if (invoices) {
      console.log('[Invoices] Fetched invoices from database:', invoices);
      
      const hasShootingDates = invoices.some(inv => inv.shootingDate);
      console.log('[Invoices] Any invoices have shootingDate?', hasShootingDates);
      
      if (hasShootingDates) {
        const samplesWithDates = invoices
          .filter(inv => inv.shootingDate)
          .map(inv => ({ 
            id: inv.id, 
            number: inv.number, 
            shootingDate: inv.shootingDate 
          }));
        console.log('[Invoices] Samples with shooting dates:', samplesWithDates);
      } else {
        console.log('[Invoices] No shooting dates found in any invoices');
        
        if (invoices.length > 0) {
          console.log('[Invoices] Sample invoice full structure:', JSON.stringify(invoices[0], null, 2));
          
          const firstInvoice = invoices[0];
          const possibleDateFields = Object.keys(firstInvoice).filter(
            key => key.toLowerCase().includes('date') || key.toLowerCase().includes('shooting')
          );
          console.log('[Invoices] Possible date-related fields found:', possibleDateFields);
        }

        // Log invoices with jobIds
        const invoicesWithJobIds = invoices.filter(inv => inv.jobId);
        console.log('[Invoices] Invoices with jobIds:', 
          invoicesWithJobIds.map(inv => ({ id: inv.id, number: inv.number, jobId: inv.jobId })));
      }
      
      setLocalInvoices(invoices);
    }
  }, [invoices]);

  // Query to fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', selectedCompanyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', selectedCompanyId);
      return data || [];
    },
    enabled: !!selectedCompanyId,
  });

  // Query to fetch jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', selectedCompanyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('company_id', selectedCompanyId);
      return data || [];
    },
    enabled: !!selectedCompanyId,
  });

  // Helper functions
  const getClientName = (clientId) => {
    const client = clients.find(client => client.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const getJobName = (jobId) => {
    if (!jobId) return 'N/A';
    const job = jobs.find(job => job.id === jobId);
    return job ? job.title : 'Unknown Job';
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

  // Modal handlers
  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  // Sorting handler
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        let direction: 'asc' | 'desc' | null;
        if (prevConfig.direction === 'asc') {
          direction = 'desc';
        } else if (prevConfig.direction === 'desc') {
          direction = 'asc';
        } else {
          direction = 'asc';
        }
        return { key, direction };
      }
      
      return { key, direction: 'asc' };
    });
  };

  // Export handlers
  const handleExportOpen = () => {
    setIsExportDialogOpen(true);
  };

  const handleExportClose = () => {
    setIsExportDialogOpen(false);
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    const formattedData = formatInvoicesForExport(filteredInvoices, clients, jobs);
    exportDataToFile(formattedData, {
      filename: 'invoices-export',
      format,
      dateRange: dateRange || null
    });
    toast.success(`Invoices exported as ${format.toUpperCase()} successfully`);
  };

  // Filter and sort invoices
  const filteredInvoices = filterInvoices(
    localInvoices,
    searchQuery,
    dateRange,
    getClientName,
    getJobName
  );

  const sortedInvoices = sortInvoices(
    filteredInvoices,
    sortConfig,
    getClientName,
    getJobName,
    jobDates
  );

  // Log sorted invoices for debugging
  React.useEffect(() => {
    if (sortedInvoices.length > 0) {
      console.log('[Invoices] First few sorted invoices:', sortedInvoices.slice(0, 3).map(inv => ({
        id: inv.id,
        number: inv.number,
        date: inv.date,
        shootingDate: inv.shootingDate,
        jobId: inv.jobId,
        jobDate: inv.jobId && jobDates[inv.jobId] ? jobDates[inv.jobId] : null
      })));
    }
  }, [sortedInvoices, jobDates]);

  const companyCurrency = selectedCompany?.currency || 'USD';

  return (
    <PageTransition>
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={handleExportClose}
        onExport={handleExport}
        title="Export Invoices"
        description="Export your filtered invoices data as CSV or Excel file"
        count={filteredInvoices.length}
      />

      <div className="container mx-auto py-6 px-4">
        <InvoicesToolbar 
          onCreateInvoice={openCreateModal}
          onExportOpen={handleExportOpen}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        
        <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>All Invoices</CardTitle>
            <div className="flex gap-2">
              <DateRangeFilter
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
          </CardHeader>
          <CardContent>
            <SearchBox
              placeholder="Search invoices by number, client name, job, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
            
            {isLoading ? (
              <div className="text-center py-4">Loading invoices...</div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">Failed to load invoices</div>
            ) : localInvoices.length === 0 ? (
              <InvoicesEmptyState />
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No invoices match your search or date filter</p>
                {dateRange?.from && (
                  <Button 
                    variant="ghost" 
                    className="mt-2" 
                    onClick={() => setDateRange(undefined)}
                  >
                    Clear Date Filter
                  </Button>
                )}
              </div>
            ) : (
              <InvoicesTable 
                invoices={sortedInvoices}
                sortConfig={sortConfig}
                onSort={handleSort}
                getClientName={getClientName}
                getJobName={getJobName}
                getJobDateDisplay={getJobDateDisplay}
                companyCurrency={companyCurrency}
              />
            )}
          </CardContent>
        </Card>

        <CreateInvoiceModal 
          isOpen={isCreateModalOpen} 
          onClose={closeCreateModal} 
        />
      </div>
    </PageTransition>
  );
};

export default Invoices;
