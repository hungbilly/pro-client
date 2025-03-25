
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Client, Job } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, User, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { getClient, saveJob, updateJob, getJob } from '@/lib/storage';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { useCompany } from './CompanySelector';
import { Checkbox } from '@/components/ui/checkbox';

interface JobFormProps {
  job?: Job;
  clientId?: string;
  onSuccess?: () => void;
}

const JobForm: React.FC<JobFormProps> = ({ job: existingJob, clientId: predefinedClientId, onSuccess }) => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [title, setTitle] = useState(existingJob?.title || '');
  const [description, setDescription] = useState(existingJob?.description || '');
  const [status, setStatus] = useState<'active' | 'completed' | 'cancelled'>(existingJob?.status || 'active');
  const [date, setDate] = useState<Date | null>(existingJob?.date ? new Date(existingJob.date) : null);
  const [location, setLocation] = useState(existingJob?.location || '');
  const [startTime, setStartTime] = useState(existingJob?.startTime || '09:00');
  const [endTime, setEndTime] = useState(existingJob?.endTime || '17:00');
  const [isFullDay, setIsFullDay] = useState(existingJob?.isFullDay || false);

  const clientId = predefinedClientId || clientIdParam || existingJob?.clientId || '';
  const { selectedCompany } = useCompany();

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

    if (!selectedCompany) {
      toast.error('No company selected. Please select a company from the top navigation.');
      return;
    }

    const formattedDate = date ? format(date, 'yyyy-MM-dd') : undefined;

    try {
      if (existingJob) {
        const updatedJob: Job = {
          id: existingJob.id,
          clientId: client.id,
          companyId: selectedCompany.id,
          title,
          description,
          status,
          date: formattedDate,
          location,
          startTime: isFullDay ? undefined : startTime,
          endTime: isFullDay ? undefined : endTime,
          isFullDay,
          createdAt: existingJob.createdAt,
          updatedAt: new Date().toISOString()
        };

        await updateJob(updatedJob);
        toast.success('Job updated successfully!');
      } else {
        const newJob = {
          clientId: client.id,
          companyId: selectedCompany.id,
          title,
          description,
          status,
          date: formattedDate,
          location,
          startTime: isFullDay ? undefined : startTime,
          endTime: isFullDay ? undefined : endTime,
          isFullDay
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
      {existingJob && (
        <CardHeader>
          <CardTitle>Edit Job</CardTitle>
        </CardHeader>
      )}
      <CardContent className={existingJob ? "pt-0" : "pt-6"}>
        <Card className="mt-4 bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <div className="text-lg font-medium mb-3 border-b pb-2">Client Information</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">{client.name}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm text-gray-600">Email</div>
                  <div>{client.email}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm text-gray-600">Phone</div>
                  <div>{client.phone}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm text-gray-600">Address</div>
                  <div className="text-sm">{client.address}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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
          
          {/* Time Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isFullDay" 
                checked={isFullDay} 
                onCheckedChange={(checked) => {
                  setIsFullDay(checked === true);
                }}
              />
              <Label htmlFor="isFullDay">Full Day</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    id="startTime"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={isFullDay}
                    className={isFullDay ? "opacity-50" : ""}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    id="endTime"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={isFullDay}
                    className={isFullDay ? "opacity-50" : ""}
                  />
                </div>
              </div>
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
