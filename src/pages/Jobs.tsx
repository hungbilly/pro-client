
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import AddJobModal from '@/components/ui-custom/AddJobModal';
import { Job } from '@/types';

const Jobs = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);

  // Fetch jobs data
  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      try {
        // This would typically be an API call to fetch jobs
        return [];
      } catch (error) {
        console.error('Error fetching jobs:', error);
        throw error;
      }
    },
  });

  // Filter jobs based on search query
  const filteredJobs = jobs.filter((job: Job) => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJobClick = (jobId: string) => {
    navigate(`/job/${jobId}`);
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold mb-4 md:mb-0">Jobs</h1>
          
          <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button onClick={() => setIsAddJobModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Job
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-48 p-6"></CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">Error loading jobs. Please try again.</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No jobs found. Add your first job to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((job: Job) => (
              <Card 
                key={job.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleJobClick(job.id)}
              >
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{job.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {new Date(job.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm line-clamp-2">{job.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AddJobModal 
          isOpen={isAddJobModalOpen} 
          onClose={() => setIsAddJobModalOpen(false)} 
        />
      </div>
    </PageTransition>
  );
};

export default Jobs;
