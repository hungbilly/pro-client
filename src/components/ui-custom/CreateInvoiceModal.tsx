
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJobs } from '@/lib/storage';
import { FileText, Plus } from 'lucide-react';
import { useCompanyContext } from '@/context/CompanyContext';
import AddJobButton from './AddJobButton';
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
  
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', selectedCompanyId],
    queryFn: () => getJobs(selectedCompanyId),
    enabled: !!selectedCompanyId && isOpen,
  });

  const handleJobSelect = (jobId: string, clientId: string) => {
    // Navigate to create invoice page with the selected job
    navigate(`/job/${jobId}/invoice/create`);
    onClose();
  };

  const navigateToNewJob = () => {
    navigate('/job/new');
    onClose();
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
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.clientId}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          job.status === 'active' ? 'bg-green-100 text-green-800' : 
                          job.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
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
          
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Or create an invoice directly for a client</p>
            <Button variant="outline" onClick={() => navigate('/client/new/invoice/create')}>
              Create Invoice Without Job
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceModal;
