import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Client, Job } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, User, Mail, Phone, MapPin, Globe, Loader2 } from 'lucide-react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import TeammateSelector from './teammates/TeammateSelector';
import { inviteTeammatesToJob } from '@/lib/teammateStorage';
import { JobTeammate } from '@/types/teammate';

interface JobFormProps {
  job?: Job;
  clientId?: string;
  onSuccess?: (jobId: string) => void;
}

const JobForm: React.FC<JobFormProps> = ({ job: existingJob, clientId: predefinedClientId, onSuccess }) => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
  const [calendarEventId, setCalendarEventId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [selectedTeammates, setSelectedTeammates] = useState<Array<{ id?: string; name: string; email: string }>>([]);

  const clientId = predefinedClientId || clientIdParam || existingJob?.clientId || '';
  const { selectedCompany } = useCompany();
  
  const timezoneToUse = selectedCompany?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  console.log('Company timezone:', selectedCompany?.timezone);
  console.log('Timezone to use:', timezoneToUse);

  const { data: allJobs = [] } = useQuery({
    queryKey: ['all-jobs', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany) return [];
      return await getJobs(selectedCompany.id);
    },
    enabled: !!selectedCompany
  });

  const { data: hasCalendarIntegration, isLoading: checkingIntegration } = useQuery({
    queryKey: ['calendar-integration', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('user_integrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'google_calendar')
        .limit(1);
      
      if (error) {
        console.error('Error checking calendar integration:', error);
        return false;
      }
      
      return data && data.length > 0;
    },
    enabled: !!user
  });

  const { data: assignedJobTeammates = [] } = useQuery({
    queryKey: ['job-teammates', existingJob?.id],
    queryFn: async () => {
      if (!existingJob?.id) return [];
      const { getJobTeammates } = await import('@/lib/teammateStorage');
      return await getJobTeammates(existingJob.id);
    },
    enabled: !!existingJob?.id
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
  }, [clientId, navigate]);

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

  const manageJobCalendar = async (operation: string, jobId: string, teammates: Array<{ id?: string; name: string; email: string }>, eventId?: string) => {
    if (!user) {
      console.log('❌ [FRONTEND] Cannot manage calendar - no user');
      return;
    }
    
    console.log(`🔄 [FRONTEND] Managing job calendar: ${operation} for job ${jobId}`);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('❌ [FRONTEND] No active session for calendar management');
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('manage-job-calendar', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          operation,
          jobId,
          teammates,
          timeZone: timezoneToUse,
          eventId
        }
      });
      
      if (error) {
        console.error('❌ [FRONTEND] Error managing job calendar:', error);
        throw error;
      }
      
      if (data.success) {
        console.log('✅ [FRONTEND] Successfully managed job calendar');
        return data;
      } else {
        throw new Error(data.message || 'Failed to manage job calendar');
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error in manageJobCalendar:', error);
      throw error;
    }
  };

  const createJobTeammateRecords = async (jobId: string, teammates: Array<{ id?: string; name: string; email: string }>) => {
    console.log('📝 [FRONTEND] Creating job teammate records only (no calendar event)');
    
    try {
      for (const teammate of teammates) {
        const { error } = await supabase
          .from('job_teammates')
          .insert({
            job_id: jobId,
            teammate_id: teammate.id,
            teammate_name: teammate.name,
            teammate_email: teammate.email,
            invitation_status: 'pending'
          });
          
        if (error) {
          console.error('❌ [FRONTEND] Error creating job teammate record:', error);
          throw error;
        }
      }
      
      console.log('✅ [FRONTEND] Successfully created job teammate records');
      return true;
    } catch (error) {
      console.error('❌ [FRONTEND] Error in createJobTeammateRecords:', error);
      throw error;
    }
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
    
    console.log('Saving job with timezone:', timezoneToUse);

    if (isSubmitting) {
      console.log('Submission already in progress, ignoring duplicate request');
      return;
    }

    setIsSubmitting(true);
    setSubmitAttempted(true);

    try {
      if (existingJob) {
        console.log('📝 [FRONTEND] === EDITING EXISTING JOB ===');
        console.log('📝 [FRONTEND] Existing job ID:', existingJob.id);
        console.log('📝 [FRONTEND] Existing job calendar event ID:', existingJob.calendarEventId);
        console.log('📊 [FRONTEND] Selected teammates for editing:', selectedTeammates);
        console.log('📊 [FRONTEND] Number of selected teammates:', selectedTeammates.length);
        
        const isAddingDate = !existingJob.date && formattedDate;
        const contentFieldsChanged = 
          existingJob.title !== title || 
          existingJob.description !== description;
          
        const dateFieldsChanged =
          existingJob.date !== formattedDate ||
          existingJob.startTime !== (isFullDay ? undefined : startTime) ||
          existingJob.endTime !== (isFullDay ? undefined : endTime) ||
          existingJob.isFullDay !== isFullDay;
        
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
          calendarEventId: existingJob.calendarEventId,
          timezone: timezoneToUse
        };

        console.log('🔄 [FRONTEND] Updating job with data:', updatedJob);
        await updateJob(updatedJob);
        console.log('✅ [FRONTEND] Job updated successfully');

        // Handle teammates for existing job using unified function
        if (selectedTeammates.length > 0 && formattedDate) {
          console.log('👥 [FRONTEND] === PROCESSING TEAMMATES FOR EXISTING JOB ===');
          console.log('👥 [FRONTEND] Has calendar integration:', hasCalendarIntegration);
          console.log('👥 [FRONTEND] Existing calendar event ID:', existingJob.calendarEventId);
          
          try {
            if (hasCalendarIntegration && existingJob.calendarEventId) {
              console.log('📅 [FRONTEND] Adding teammates to existing calendar event using unified function');
              await manageJobCalendar('add_teammates', existingJob.id, selectedTeammates, existingJob.calendarEventId);
              toast.success('Teammates added to job and calendar event');
            } else if (hasCalendarIntegration && !existingJob.calendarEventId) {
              console.log('📅 [FRONTEND] Creating new calendar event with teammates using unified function');
              await manageJobCalendar('create_with_teammates', existingJob.id, selectedTeammates);
              toast.success('Calendar event created with teammates');
            } else {
              console.log('📝 [FRONTEND] No calendar integration - teammates added to database only');
              await createJobTeammateRecords(existingJob.id, selectedTeammates);
              toast.success('Teammates added to job');
            }

            // Invalidate the job teammates query to refresh the data
            console.log('🔄 [FRONTEND] Invalidating job teammates query cache');
            queryClient.invalidateQueries({ queryKey: ['job-teammates', existingJob.id] });
          } catch (error) {
            console.error('❌ [FRONTEND] Error handling teammates:', error);
            toast.error('Failed to add teammates');
          }
        }
        
        // Handle calendar updates for job details (not teammates)
        if (hasCalendarIntegration && existingJob.calendarEventId && (dateFieldsChanged || contentFieldsChanged) && formattedDate) {
          console.log('📅 [FRONTEND] Updating existing calendar event due to job details change');
          try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
              await supabase.functions.invoke('update-calendar-event', {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: {
                  eventId: existingJob.calendarEventId,
                  userId: user?.id,
                  timeZone: timezoneToUse,
                  jobId: existingJob.id,
                  jobData: {
                    title: title,
                    description: description,
                    date: formattedDate,
                    location: location,
                    start_time: isFullDay ? undefined : startTime,
                    end_time: isFullDay ? undefined : endTime,
                    is_full_day: isFullDay,
                    timeZone: timezoneToUse,
                    clientId: client.id
                  }
                }
              });
              
              toast.success('Calendar event updated');
            }
          } catch (error) {
            console.error('Failed to update calendar event:', error);
            toast.error('Failed to update calendar event');
          }
        }
        
        toast.success('Job updated successfully!');
        
        if (onSuccess) {
          onSuccess(existingJob.id);
        } else {
          navigate(`/job/${existingJob.id}`);
        }
      } else {
        console.log('🆕 [FRONTEND] === CREATING NEW JOB ===');
        console.log('👥 [FRONTEND] Selected teammates for new job:', selectedTeammates);
        
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
          isFullDay,
          calendarEventId: null,
          timezone: timezoneToUse
        };

        console.log('Creating new job with data:', newJobData);
        const savedJob = await saveJob(newJobData);
        
        if (!savedJob || !savedJob.id) {
          throw new Error('Failed to create job - no job ID returned');
        }
        
        setNewJob(savedJob);

        // Handle calendar creation for new job using unified function
        if (formattedDate && hasCalendarIntegration) {
          try {
            if (selectedTeammates.length > 0) {
              console.log('👥 [FRONTEND] Creating calendar event with teammates using unified function');
              await manageJobCalendar('create_with_teammates', savedJob.id, selectedTeammates);
              toast.success('Job created and teammates invited successfully!');
              
              // Invalidate the job teammates query for the new job
              queryClient.invalidateQueries({ queryKey: ['job-teammates', savedJob.id] });
              
              // Navigate directly since calendar event was created by unified function
              if (onSuccess) {
                onSuccess(savedJob.id);
              } else {
                navigate(`/job/${savedJob.id}`);
              }
            } else {
              console.log('📅 [FRONTEND] Creating personal calendar event using unified function');
              await manageJobCalendar('create_with_teammates', savedJob.id, []);
              toast.success('Job created and added to calendar!');
              
              if (onSuccess) {
                onSuccess(savedJob.id);
              } else {
                navigate(`/job/${savedJob.id}`);
              }
            }
          } catch (error) {
            console.error('Error creating calendar event:', error);
            toast.error('Job created but failed to add to calendar');
            
            if (onSuccess) {
              onSuccess(savedJob.id);
            } else {
              navigate(`/job/${savedJob.id}`);
            }
          }
        } else if (selectedTeammates.length > 0) {
          // No calendar integration but has teammates - create database records only
          try {
            await createJobTeammateRecords(savedJob.id, selectedTeammates);
            toast.success('Job created and teammates invited!');
            
            queryClient.invalidateQueries({ queryKey: ['job-teammates', savedJob.id] });
            
            if (onSuccess) {
              onSuccess(savedJob.id);
            } else {
              navigate(`/job/${savedJob.id}`);
            }
          } catch (error) {
            console.error('Error inviting teammates:', error);
            toast.error('Job created but failed to invite teammates');
            
            if (onSuccess) {
              onSuccess(savedJob.id);
            } else {
              navigate(`/job/${savedJob.id}`);
            }
          }
        } else {
          // No calendar integration and no teammates - just navigate
          toast.success('Job created successfully!');
          
          if (onSuccess) {
            onSuccess(savedJob.id);
          } else {
            navigate(`/job/${savedJob.id}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to save/update job:', error);
      toast.error('Failed to save/update job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      console.log('Submit already in progress, preventing duplicate submission');
      return;
    }
    
    setSubmitAttempted(true);
    
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

  const handleCalendarDialogClose = (shouldAddEvent: boolean = false) => {
    setShowCalendarDialog(false);
    
    // This dialog is no longer needed since we use the unified function
    if (onSuccess && newJob) {
      onSuccess(newJob.id);
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
          
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
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
              
              <div>
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label>Time Zone: {timezoneToUse}</Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  Times are in the company's time zone. You can change this in company settings.
                </p>
              </div>
            </div>

            {/* Teammate Selection */}
            <TeammateSelector
              selectedTeammates={selectedTeammates}
              onTeammatesChange={setSelectedTeammates}
              currentJobTeammates={assignedJobTeammates}
            />
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/client/${client.id}`)} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || submitAttempted}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {existingJob ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              existingJob ? 'Update Job' : 'Create Job'
            )}
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
        onClose={handleCalendarDialogClose}
        job={newJob}
        client={client}
      />
    </>
  );
};

export default JobForm;
