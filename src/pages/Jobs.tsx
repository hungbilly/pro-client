
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import { JobList } from '@/components/JobList';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { getJobs } from '@/lib/storage';
import AddJobModal from '@/components/ui-custom/AddJobModal';

const Jobs = () => {
  const navigate = useNavigate();
  const [jobModalOpen, setJobModalOpen] = useState(false);
  
  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: getJobs,
  });

  const handleAddJob = () => {
    setJobModalOpen(true);
  };

  const handleJobAdded = () => {
    setJobModalOpen(false);
    refetch();
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Jobs</h1>
          <Button onClick={handleAddJob} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Add New Job
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p>Loading jobs...</p>
            </CardContent>
          </Card>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="mb-4">No jobs found.</p>
              <Button onClick={handleAddJob} variant="outline">Create Your First Job</Button>
            </CardContent>
          </Card>
        ) : (
          <JobList jobs={jobs} />
        )}

        <AddJobModal isOpen={jobModalOpen} onClose={handleJobAdded} />
      </div>
    </PageTransition>
  );
};

export default Jobs;
