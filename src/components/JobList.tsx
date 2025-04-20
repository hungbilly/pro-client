
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Job, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { deleteJob, getJobs } from '@/lib/storage';
import { useCompany } from './CompanySelector';

interface JobListProps {
  client?: Client;
}

const JobList: React.FC<JobListProps> = ({ client }) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const { selectedCompany } = useCompany();

  useEffect(() => {
    const fetchJobs = async () => {
      if (!selectedCompany) return;
      try {
        const allJobs = await getJobs(selectedCompany.id);
        setJobs(allJobs);
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
        toast.error("Failed to fetch jobs");
      }
    };

    fetchJobs();
  }, [selectedCompany]);

  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteJob(jobId);
      // After deletion is successful, remove the job from state
      setJobs(jobs.filter(job => job.id !== jobId));
      toast.success("Job deleted successfully");
    } catch (error) {
      console.error("Failed to delete job:", error);
      toast.error("Failed to delete job");
    }
  };

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

  const filteredJobs = client ? jobs.filter(job => job.clientId === client.id) : jobs;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Jobs</h3>
        <Button asChild>
          <Link to="/job/new">
            <FileText className="h-4 w-4 mr-2" />
            Create Job
          </Link>
        </Button>
      </div>
      
      {filteredJobs.length === 0 ? (
        <Card className="w-full">
          <CardContent className="py-8">
            <div className="text-center">
              No jobs found.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="w-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">
                    <Link to={`/job/${job.id}`} className="hover:underline">
                      {job.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {job.date && (
                      <div className="flex items-center">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        {new Date(job.date).toLocaleDateString()}
                      </div>
                    )}
                    {job.location && (
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {job.location}
                      </div>
                    )}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(job.status)}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </Badge>
              </CardHeader>
              <CardContent>
                {job.description}
              </CardContent>
              <Separator />
              <CardContent className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => navigate(`/job/${job.id}`)}>
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobList;
