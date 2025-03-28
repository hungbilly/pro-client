
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJobs } from '@/lib/storage';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, MoreHorizontal, Eye, FileEdit, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PageTransition from '@/components/ui-custom/PageTransition';
import AddJobButton from '@/components/ui-custom/AddJobButton';
import SearchBox from '@/components/ui-custom/SearchBox';
import ExportDateRangeDialog from '@/components/ExportDateRangeDialog';
import { exportDataToFile, formatJobsForExport } from '@/utils/exportUtils';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompanyContext } from '@/context/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

const Jobs = () => {
  const { selectedCompany } = useCompanyContext();
  const selectedCompanyId = selectedCompany?.id;
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ['jobs', selectedCompanyId],
    queryFn: () => getJobs(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  // Fetch clients to display names instead of IDs
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

  const getClientName = (clientId) => {
    const client = clients.find(client => client.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const handleRowClick = (jobId: string) => {
    navigate(`/job/${jobId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter jobs based on search query
  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getClientName(job.clientId).toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExportOpen = () => {
    setIsExportDialogOpen(true);
  };

  const handleExportClose = () => {
    setIsExportDialogOpen(false);
  };

  const handleExport = (format: 'csv' | 'xlsx', dateRange: DateRange | null) => {
    const formattedData = formatJobsForExport(filteredJobs, clients);
    exportDataToFile(formattedData, {
      filename: 'jobs-export',
      format,
      dateRange
    });
    toast.success(`Jobs exported as ${format.toUpperCase()} successfully`);
  };

  return (
    <PageTransition>
      <ExportDateRangeDialog
        isOpen={isExportDialogOpen}
        onClose={handleExportClose}
        onExport={handleExport}
        title="Export Jobs"
        description="Export your jobs data as CSV or Excel file"
        count={filteredJobs.length}
      />

      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <h1 className="text-3xl font-bold mb-4 sm:mb-0">Jobs</h1>
          <div className="flex gap-2">
            <AddJobButton />
          </div>
        </div>
        
        <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>All Jobs</CardTitle>
            <Button variant="outline" onClick={handleExportOpen}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <SearchBox
              placeholder="Search jobs by title, client name, location, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
            
            {isLoading ? (
              <div className="text-center py-4">Loading jobs...</div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">Failed to load jobs</div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Jobs Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  You haven't created any jobs yet. Create your first job to get started.
                </p>
                <AddJobButton />
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
                      <TableHead className="hidden md:table-cell">Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow 
                        key={job.id} 
                        className="cursor-pointer"
                        onClick={() => handleRowClick(job.id)}
                      >
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>{getClientName(job.clientId)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {job.date ? new Date(job.date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{job.location || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/job/${job.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    <span>View</span>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={`/job/${job.id}/edit`}>
                                    <FileEdit className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
                                  </Link>
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
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Jobs;
