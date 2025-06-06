
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJobs } from '@/lib/storage';
import { FileText, Plus, Search } from 'lucide-react';
import { useCompanyContext } from '@/context/CompanyContext';
import AddJobButton from './AddJobButton';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { selectedCompany } = useCompanyContext();
  const selectedCompanyId = selectedCompany?.id;
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', selectedCompanyId],
    queryFn: () => getJobs(selectedCompanyId),
    enabled: !!selectedCompanyId && isOpen,
  });

  // Query to fetch clients information for display
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-modal', selectedCompanyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', selectedCompanyId);
      return data || [];
    },
    enabled: !!selectedCompanyId && isOpen,
  });

  // Create a map of client IDs to client names for quick lookup
  const clientNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach(client => {
      map[client.id] = client.name;
    });
    return map;
  }, [clients]);

  // Get client name from the map
  const getClientName = (clientId: string | null | undefined): string => {
    if (!clientId) return 'Unknown Client';
    return clientNameMap[clientId] || 'Unknown Client';
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getClientName(job.clientId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJobSelect = (jobId: string, clientId: string) => {
    // Navigate to create invoice page with the selected job
    navigate(`/job/${jobId}/invoice/create`);
    onClose();
  };

  const navigateToNewJob = () => {
    navigate('/job/new');
    onClose();
  };

  // Helper function to safely capitalize a string, handling null/undefined values
  const capitalizeStatus = (status: string | null | undefined): string => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Select an existing job or create a new one first
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Your Jobs</h3>
            <AddJobButton size="sm" variant="outline" />
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title or client..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">You don't have any jobs yet</p>
              <Button onClick={navigateToNewJob}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Job
              </Button>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No jobs found matching your search</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{getClientName(job.clientId)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          job.status === 'active' ? 'bg-green-100 text-green-800' : 
                          job.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {capitalizeStatus(job.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          onClick={() => handleJobSelect(job.id, job.clientId)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Create Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceModal;
