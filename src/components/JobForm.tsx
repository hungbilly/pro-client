
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
import { getClient, saveJob, updateJob, getJob, getJobs } from '@/lib/storage';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { useCompany } from './CompanySelector';
import { Checkbox } from '@/components/ui/checkbox';
import JobWarningDialog from './JobWarningDialog';
import { AddToCalendarDialog } from './AddToCalendarDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface JobFormProps {
  job?: Job;
  clientId?: string;
  onSuccess?: () => void;
}

const JobForm: React.FC<JobFormProps> = ({ job: existingJob, clientId: predefinedClientId, onSuccess }) => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [title, setTitle] = useState(existingJob?.title || '');
  const [description, setDescription] = useState(existingJob?.description || '');
  const [status, setStatus] = useState<'active' | 'completed' | 'cancelled'>(existingJob?.status || 'active');
  const [date, setDate] = useState<Date | null>(existingJob?.date ? new Date(existingJob.date) : null);
  const [location, setLocation] = useState(existingJob?.location || '');
  const [startTime, setStartTime] = useState(existingJob?.startTime || '09:00');
  const [endTime, setEndTime] = useState(existingJob?.endTime || '17:00');
  const [isFullDay, setIsFullDay] = useState(existingJob?.isFullDay || false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [conflictingJobs, setConflictingJobs] = useState<Job[]>([]);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [newJob, setNewJob] = useState<Job | null>(null);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [calendarEventId, setCalendarEventId] = useState<string | null>(existingJob?.calendarEventId || null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [hasCalendarIntegration, setHasCalendarIntegration] = useState<boolean | null>(null);
  const [isCheckingIntegration, setIsCheckingIntegration] = useState(false);

  const clientId = predefinedClientId || clientIdParam || existingJob?.clientId || '';
  const { selectedCompany } = useCompany();

  const { data: allJobs = [] } = useQuery({
    queryKey: ['all-jobs', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany) return [];
      return await getJobs(selectedCompany.id);
    },
    enabled: !!selectedCompany
  });

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

    // Check if user has calendar integration
    if (user) {
      checkCalendarIntegration();
    }
  }, [clientId, navigate, user]);

  const checkCalendarIntegration = async () => {
    try {
      setIsCheckingIntegration(true);
      
      const { data, error } = await supabase
        .from('user_integrations')
        .select('id')
        .eq('user_id', user?.id)
        .eq('provider', 'google_calendar')
        .limit(1);
      
      if (error) {
        console.error('Error checking integration:', error);
        setHasCalendarIntegration(false);
        return;
      }
      
      setHasCalendarIntegration(data && data.length > 0);
    } catch (error) {
      console.error('Exception checking integration:', error);
      setHasCalendarIntegration(false);
    } finally {
      setIsCheckingIntegration(false);
    }
  };

  const addToCalendar = async (job: Job, client: Client) => {
    if (!user) {
      console.error('No user found for calendar integration');
      return null;
    }
    
    try {
      setIsAddingToCalendar(true);
      setCalendarError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      const { data, error } = await supabase.functions.invoke('add-to-calendar', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          jobId: job.id,
          clientId: client.id,
          userId: user.id
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.error) {
        throw new Error(data.message || data.error);
      }
      
      if (!data.success) {
        // If the response indicates no integration setup, track this but don't show as error
        if (data.message?.includes('integration not set up')) {
          setHasCalendarIntegration(false);
          return null;
        }
        throw new Error(data.message || 'Failed to create calendar event');
      }
      
      return data.eventId;
    } catch (error) {
      console.error('Error adding to calendar:', error);
      setCalendarError(error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  const updateCalendarEvent = async (job: Job, client: Client, eventId: string) => {
    if (!user) {
      console.error('No user found for calendar integration');
      return false;
    }
    
    try {
      setIsAddingToCalendar(true);
      setCalendarError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      const { data, error } = await supabase.functions.invoke('update-calendar-event', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          eventId,
          jobData: {
            title: job.title,
            description: job.description,
            date: job.date,
            location: job.location,
            is_full_day: job.isFullDay,
            start_time: job.startTime,
            end_time: job.endTime
          },
          userId: user.id
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update calendar event');
      }
      
      return true;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      setCalendarError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  const deleteCalendarEvent = async (eventId: string) => {
    if (!user || !eventId) {
      console.error('Missing user or calendar event ID');
      return false;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      const { data, error } = await supabase.functions.invoke('delete-calendar-event', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          eventId,
          userId: user.id
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete calendar event');
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  };

  const checkForConflicts = () => {
    if (!date) return false;
    
    const formattedDate = format(date, 'yyyy-MM-dd');
    const jobsOnSameDay = allJobs.filter(job => {
      if (existingJob && job.id === existingJob.id) return false;
      
      return job.date === formattedDate;
    });
    
    if (jobsOnSameDay.length > 0) {
      setConflictingJobs(jobsOnSameDay);
      setShowWarningDialog(true);
      return true;
    }
    
    return false;
  };

  const processJobSubmission = async () => {
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
        // Update existing job
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
          updatedAt: new Date().toISOString(),
          calendarEventId: calendarEventId ?? undefined
        };

        // Update the job in the database
        await updateJob(updatedJob);
        
        // If the job has a calendar event ID, update the calendar event
        if (calendarEventId && hasCalendarIntegration) {
          const updated = await updateCalendarEvent(updatedJob, client, calendarEventId);
          if (updated) {
            toast.success('Job and calendar event updated successfully!');
          } else {
            toast.success('Job updated successfully!');
            if (calendarError) {
              toast.error(`Calendar event could not be updated: ${calendarError}`);
            }
          }
        } else if (hasCalendarIntegration === true) {
          // If there's no existing calendar event but user has integration, ask if they want to add it
          setNewJob(updatedJob);
          setShowCalendarDialog(true);
        } else {
          toast.success('Job updated successfully!');
          
          if (onSuccess) {
            onSuccess();
          } else {
            navigate(`/job/${existingJob.id}`);
          }
        }
        
        if (!showCalendarDialog && onSuccess) {
          onSuccess();
        } else if (!showCalendarDialog) {
          navigate(`/job/${existingJob.id}`);
        }
      } else {
        // Create new job
        const newJobData = {
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

        const savedJob = await saveJob(newJobData);
        setNewJob(savedJob);
        toast.success('Job created successfully!');
        
        // If user has calendar integration, show calendar dialog
        if (hasCalendarIntegration) {
          setShowCalendarDialog(true);
        } else {
          if (onSuccess) {
            onSuccess();
          } else {
            navigate(`/job/${savedJob.id}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to save/update job:', error);
      toast.error('Failed to save/update job.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasConflicts = checkForConflicts();
    
    if (!hasConflicts) {
      processJobSubmission();
    }
  };

  const onConfirmScheduling = () => {
    setShowWarningDialog(false);
    processJobSubmission();
  };

  const onCancelScheduling = () => {
    setShowWarningDialog(false);
  };

  const handleCalendarDialogClose = async (shouldAddToCalendar: boolean = false) => {
    setShowCalendarDialog(false);
    
    // If the user wants to add the job to their calendar and we have a job object
    if (shouldAddToCalendar && newJob && client) {
      try {
        const eventId = await addToCalendar(newJob, client);
        
        if (eventId) {
          // Update the job with the calendar event ID
          const updatedJob = { ...newJob, calendarEventId: eventId };
          await updateJob(updatedJob);
          toast.success('Job added to calendar successfully!');
          setCalendarEventId(eventId);
        } else if (calendarError) {
          toast.error(`Failed to add job to calendar: ${calendarError}`);
        }
      } catch (error) {
        console.error('Error in calendar dialog action:', error);
        toast.error('Error adding job to calendar');
      }
    }
    
    if (onSuccess) {
      onSuccess();
    } else if (newJob) {
      navigate(`/job/${newJob.id}`);
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
    <>
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
          <Button onClick={handleSubmit} disabled={isAddingToCalendar}>
            {existingJob ? 'Update Job' : 'Create Job'}
          </Button>
        </CardFooter>
      </Card>

      <JobWarningDialog
        isOpen={showWarningDialog}
        onClose={onCancelScheduling}
        onConfirm={onConfirmScheduling}
        existingJobs={conflictingJobs}
        date={date}
      />

      <AddToCalendarDialog
        isOpen={showCalendarDialog}
        onClose={() => handleCalendarDialogClose(false)}
        job={newJob}
        client={client}
        onConfirm={() => handleCalendarDialogClose(true)}
      />
    </>
  );
};

export default JobForm;
