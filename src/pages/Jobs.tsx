
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJobs, getClients } from '@/lib/storage';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, PlusCircle, Eye, FileEdit, Clock, MapPin, User, Briefcase, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PageTransition from '@/components/ui-custom/PageTransition';
import AddJobButton from '@/components/ui-custom/AddJobButton';

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
import { Job } from '@/types';

const Jobs = () => {
  console.log("Jobs page rendering");
  try {
    return (
      <PageTransition>
        <div className="container mx-auto py-6 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <h1 className="text-3xl font-bold mb-4 sm:mb-0">Jobs</h1>
            <AddJobButton />
          </div>
          
          <JobsTable />
        </div>
      </PageTransition>
    );
  } catch (error) {
    console.error("Error rendering Jobs page:", error);
    return <div className="p-8 text-center">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="text-red-500">{error instanceof Error ? error.message : String(error)}</p>
    </div>;
  }
};

const formatTimeDisplay = (job: Job) => {
  if (job.isFullDay) {
    return "Full Day";
  }
  
  if (job.startTime && job.endTime) {
    return `${job.startTime} - ${job.endTime}`;
  }
  
  return null;
};

const JobsTable = () => {
  const { selectedCompany } = useCompanyContext();
  const selectedCompanyId = selectedCompany?.id;
  const navigate = useNavigate();
  
  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ['jobs', selectedCompanyId],
    queryFn: () => getJobs(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', selectedCompanyId],
    queryFn: () => getClients(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  if (isLoading) return <CardContent>Loading jobs...</CardContent>;
  if (error) return <CardContent>Error: {error.message}</CardContent>;

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

  const handleRowClick = (jobId: string) => {
    navigate(`/job/${jobId}`);
  };

  return (
    <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
      <CardHeader>
        <CardTitle>Current Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Jobs Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              You haven't created any jobs yet. Add your first job to get started.
            </p>
            <AddJobButton />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Date/Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const jobClient = clients.find((c) => c.id === job.clientId) || null;
                  return (
                    <TableRow 
                      key={job.id} 
                      className="cursor-pointer"
                      onClick={(e) => {
                        // Prevent row click if dropdown is being interacted with
                        if (!(e.target as HTMLElement).closest('.dropdown-actions')) {
                          handleRowClick(job.id);
                        }
                      }}
                    >
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{jobClient?.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          {job.date ? new Date(job.date).toLocaleDateString() : 'N/A'}
                          {(job.startTime || job.isFullDay) && job.date && (
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{formatTimeDisplay(job)}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="dropdown-actions" onClick={(e) => e.stopPropagation()}>
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
                                <Link to={`/job/edit/${job.id}`}>
                                  <FileEdit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Jobs;
