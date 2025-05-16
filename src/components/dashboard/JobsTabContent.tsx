
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Job, Client } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Briefcase, MoreHorizontal } from 'lucide-react';
import AddJobButton from '../ui-custom/AddJobButton';

interface JobsTabContentProps {
  jobs: Job[];
  clients: Client[];
  getStatusColor: (status: string) => string;
}

const JobsTabContent: React.FC<JobsTabContentProps> = ({ jobs, clients, getStatusColor }) => {
  const navigate = useNavigate();
  const [jobSearchQuery, setJobSearchQuery] = useState('');

  const filteredJobs = [...jobs].filter(job => 
    job.title.toLowerCase().includes(jobSearchQuery.toLowerCase()) || 
    clients.find(c => c.id === job.clientId)?.name.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
    job.location && job.location.toLowerCase().includes(jobSearchQuery.toLowerCase())
  );

  const handleJobRowClick = (jobId: string) => {
    navigate(`/job/${jobId}`);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Current Jobs</h2>
        {clients.length > 0 && <AddJobButton />}
      </div>
      
      <div className="relative mb-4">
        <Input 
          placeholder="Search jobs by title, client name, or location..." 
          value={jobSearchQuery} 
          onChange={e => setJobSearchQuery(e.target.value)} 
          className="pr-10" 
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      </div>
      
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Jobs Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            You haven't created any jobs yet. Select a client to create your first job.
          </p>
          {clients.length > 0 && <AddJobButton />}
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map(job => {
                const jobClient = clients.find(c => c.id === job.clientId) || null;
                return (
                  <TableRow key={job.id} onClick={() => handleJobRowClick(job.id)} className="cursor-pointer">
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{jobClient?.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {job.date ? new Date(job.date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/job/${job.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
};

export default JobsTabContent;
