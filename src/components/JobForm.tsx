
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Client, Job } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { getClient, saveJob, updateJob, getJob } from '@/lib/storage';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { useCompany } from './CompanySelector';

interface JobFormProps {
  job?: Job;
  clientId?: string;
  companyId?: string | null;
  onSuccess?: () => void;
}

const JobForm: React.FC<JobFormProps> = ({ job: existingJob, clientId: predefinedClientId, companyId: predefinedCompanyId, onSuccess }) => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [title, setTitle] = useState(existingJob?.title || '');
  const [description, setDescription] = useState(existingJob?.description || '');
  const [status, setStatus] = useState<'active' | 'completed' | 'cancelled'>(existingJob?.status || 'active');
  const [date, setDate] = useState<Date | null>(existingJob?.date ? new Date(existingJob.date) : null);
  const [location, setLocation] = useState(existingJob?.location || '');

  const clientId = predefinedClientId || clientIdParam || existingJob?.clientId || '';
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();

  useEffect(() => {
    // If company ID is provided as a prop, use it
    if (predefinedCompanyId) {
      setSelectedCompanyId(predefinedCompanyId);
    } else if (existingJob?.companyId) {
      setSelectedCompanyId(existingJob.companyId);
    }
  }, [predefinedCompanyId, existingJob?.companyId, setSelectedCompanyId]);

  useEffect(() => {
    const fetchClient = async () => {
      if (clientId) {
        const fetchedClient = await getClient(clientId);
        if (fetchedClient) {
          setClient(fetchedClient);
        } else {
          toast.error('Client not found.');
          navigate('/');
        }
      }
    };

    fetchClient();
  }, [clientId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!client) {
      toast.error('Client is required.');
      return;
    }

    if (!title) {
      toast.error('Title is required.');
      return;
    }

    if (!selectedCompanyId) {
      toast.error('Please select a company.');
      return;
    }

    const formattedDate = date ? format(date, 'yyyy-MM-dd') : undefined;

    try {
      if (existingJob) {
        const updatedJob: Job = {
          id: existingJob.id,
          clientId: client.id,
          companyId: selectedCompanyId,
          title,
          description,
          status,
          date: formattedDate,
          location,
          createdAt: existingJob.createdAt,
          updatedAt: new Date().toISOString()
        };

        await updateJob(updatedJob);
        toast.success('Job updated successfully!');
      } else {
        const newJob = {
          clientId: client.id,
          companyId: selectedCompanyId,
          title,
          description,
          status,
          date: formattedDate,
          location
        };

        await saveJob(newJob);
        toast.success('Job created successfully!');
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        if (existingJob) {
          navigate(`/job/${existingJob.id}`);
        } else {
          navigate(`/client/${client.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to save/update job:', error);
      toast.error('Failed to save/update job.');
    }
  };

  if (!client) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            {clientId ? "Loading client data..." : "Please select a client first"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{existingJob ? 'Edit Job' : 'Create Job'}</CardTitle>
        <CardDescription>For client: {client.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Job Title</Label>
            <Input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Job description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as 'active' | 'completed' | 'cancelled')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Job Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePicker
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => navigate(`/client/${client.id}`)}>Cancel</Button>
        <Button onClick={handleSubmit}>{existingJob ? 'Update Job' : 'Create Job'}</Button>
      </CardFooter>
    </Card>
  );
};

export default JobForm;
