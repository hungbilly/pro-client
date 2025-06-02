
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Job, Client } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { BriefcaseBusiness, CalendarDays, MapPin, Plus, Clock, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { deleteJob } from '@/lib/storage';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface JobListProps {
  jobs: Job[];
  client: Client;
  onJobDelete: (jobId: string) => void;
}

const getStatusColor = (status: Job['status']) => {
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

const formatTimeDisplay = (job: Job) => {
  if (job.isFullDay) {
    return "Full Day";
  }
  
  if (job.startTime && job.endTime) {
    return `${job.startTime} - ${job.endTime}`;
  }
  
  return null;
};

const JobList: React.FC<JobListProps> = ({ jobs, client, onJobDelete }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const sortedJobs = [...jobs].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const activeJobs = sortedJobs.filter(job => job.status === 'active');
  const completedJobs = sortedJobs.filter(job => job.status === 'completed');
  const cancelledJobs = sortedJobs.filter(job => job.status === 'cancelled');

  const handleDeleteJob = async (jobId: string) => {
    console.log('handleDeleteJob called with jobId:', jobId);
    
    const jobToDelete = jobs.find(job => job.id === jobId);
    console.log('Job to delete:', jobToDelete);
    
    if (jobToDelete?.calendarEventId) {
      console.log('Job has a calendar event that will also be deleted:', jobToDelete.calendarEventId);
    }
    
    try {
      console.log('Attempting to delete job with ID:', jobId);
      const result = await deleteJob(jobId);
      console.log('Delete job result:', result);
      
      if (result) {
        console.log('Job deleted successfully, calling onJobDelete callback');
        toast.success('Job deleted successfully.');
        onJobDelete(jobId);
      } else {
        console.error('Delete job returned false');
        toast.error('Failed to delete job.');
      }
    } catch (error) {
      console.error('Exception in handleDeleteJob:', error);
      toast.error('Failed to delete job.');
    }
  };

  const handleJobCardClick = (jobId: string) => {
    navigate(`/job/${jobId}`);
  };

  const renderJobListItem = (job: Job) => {
    console.log('Rendering job list item for job:', job.id);
    
    return (
      <div 
        key={job.id} 
        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => handleJobCardClick(job.id)}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{job.title}</h4>
            <Badge className={`${getStatusColor(job.status)} flex-shrink-0`}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Badge>
          </div>
          
          {job.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{job.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {job.date && (
              <div className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                <span>{new Date(job.date).toLocaleDateString()}</span>
                {(job.startTime || job.isFullDay) && (
                  <>
                    <Clock className="h-3 w-3 ml-2" />
                    <span>{formatTimeDisplay(job)}</span>
                  </>
                )}
              </div>
            )}
            
            {job.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{job.location}</span>
              </div>
            )}
          </div>
        </div>
        
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
      </div>
    );
  };

  const renderJobSection = (title: string, icon: React.ReactNode, jobList: Job[], emptyMessage: string) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      
      {jobList.length > 0 ? (
        <div className="space-y-2">
          {jobList.map(renderJobListItem)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-8 max-w-full">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Jobs</h2>
        <Button asChild className="w-fit">
          <Link to={`/client/${client.id}/job/create`}>
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Link>
        </Button>
      </div>
      
      {sortedJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <BriefcaseBusiness className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Jobs Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              You haven't created any jobs for this client yet. Create your first job to get started.
            </p>
            <Button asChild>
              <Link to={`/client/${client.id}/job/create`}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Job
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {activeJobs.length > 0 && (
            renderJobSection(
              "Active Jobs", 
              <BriefcaseBusiness className="h-5 w-5 text-muted-foreground" />, 
              activeJobs,
              "No active jobs"
            )
          )}
          
          {completedJobs.length > 0 && (
            <>
              <Separator />
              {renderJobSection(
                "Completed Jobs", 
                <BriefcaseBusiness className="h-5 w-5 text-muted-foreground" />, 
                completedJobs,
                "No completed jobs"
              )}
            </>
          )}
          
          {cancelledJobs.length > 0 && (
            <>
              <Separator />
              {renderJobSection(
                "Cancelled Jobs", 
                <BriefcaseBusiness className="h-5 w-5 text-muted-foreground" />, 
                cancelledJobs,
                "No cancelled jobs"
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default JobList;
