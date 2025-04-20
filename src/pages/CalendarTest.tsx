import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, CalendarCheck, CalendarX, Clock, Edit, Plus, Trash, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { formatDateForGoogleCalendar } from '@/lib/utils';
import { AddToCalendarDialog } from '@/components/AddToCalendarDialog';
import { Job, Client } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CalendarEvent {
  id?: string;
  title: string;
  description: string;
  location: string;
  date: Date | null;
  isFullDay: boolean;
  startTime: string;
  endTime: string;
  calendarEventId?: string;
}

interface IntegrationDetails {
  id: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
}

const CalendarTest = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [eventType, setEventType] = useState<'job' | 'invoice'>('job');
  const [event, setEvent] = useState<CalendarEvent>({
    title: '',
    description: '',
    location: '',
    date: new Date(),
    isFullDay: false,
    startTime: '09:00',
    endTime: '17:00',
  });
  const [calendarEventId, setCalendarEventId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [hasIntegration, setHasIntegration] = useState<boolean | null>(null);
  const [isCheckingIntegration, setIsCheckingIntegration] = useState(true);
  const [lastCheckedIntegration, setLastCheckedIntegration] = useState<Date | null>(null);
  const [integrationDetails, setIntegrationDetails] = useState<any>(null);
  const [timezone, setTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const checkIntegration = async () => {
    try {
      setIsCheckingIntegration(true);
      addLog('Checking Google Calendar integration status...');
      
      const { data, error } = await supabase
        .from('user_integrations')
        .select('id, created_at, updated_at, expires_at')
        .eq('user_id', user?.id)
        .eq('provider', 'google_calendar');
      
      if (error) {
        console.error('Error checking integration:', error);
        addLog(`Error checking integration: ${error.message}`);
        setHasIntegration(false);
        setIntegrationDetails(null);
        return false;
      }
      
      setLastCheckedIntegration(new Date());
      
      if (data && data.length > 0) {
        setHasIntegration(true);
        setIntegrationDetails(data[0]);
        addLog('Google Calendar integration found');
        addLog(`Integration ID: ${data[0].id}`);
        
        const expiresAt = new Date(data[0].expires_at);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));
        
        if (minutesUntilExpiry < 60) {
          addLog(`⚠️ Token expires in ${minutesUntilExpiry} minutes`);
        } else {
          addLog(`Token valid for ${Math.floor(minutesUntilExpiry / 60)} hours`);
        }
        
        return true;
      } else {
        setHasIntegration(false);
        setIntegrationDetails(null);
        addLog('No Google Calendar integration found');
        return false;
      }
    } catch (error) {
      console.error('Exception checking integration:', error);
      addLog(`Exception checking integration: ${error instanceof Error ? error.message : String(error)}`);
      setHasIntegration(false);
      setIntegrationDetails(null);
      return false;
    } finally {
      setIsCheckingIntegration(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    checkIntegration();
  }, [user]);

  const handleInputChange = (field: keyof CalendarEvent, value: any) => {
    setEvent(prev => ({ ...prev, [field]: value }));
  };

  const createCalendarEvent = async () => {
    if (!event.title || !event.date) {
      toast.error('Title and date are required');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const hasValidIntegration = await checkIntegration();
    if (!hasValidIntegration) {
      toast.error('Calendar integration not set up', {
        description: 'Please connect your Google Calendar in the Settings page',
        action: {
          label: 'Go to Settings',
          onClick: () => window.location.href = '/settings'
        }
      });
      return;
    }

    try {
      setIsLoading(true);
      addLog(`Creating calendar event: ${event.title}`);
      
      addLog(`Using timezone: ${timezone}`);
      
      const testClient = {
        id: "test-client-id",
        name: "Test Client",
        email: "test@example.com",
        phone: "555-1234",
        address: event.location || "123 Test Street"
      };

      const formattedDate = format(event.date, 'yyyy-MM-dd');
      
      const testObject = {
        title: event.title,
        description: event.description,
        date: formattedDate,
        location: event.location,
        isFullDay: event.isFullDay,
        startTime: event.startTime,
        endTime: event.endTime,
        timeZone: timezone
      };
      
      addLog(`Event start time: ${event.startTime}, Event end time: ${event.endTime}`);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      addLog(`Using user ID: ${user.id}`);
      
      const { data, error } = await supabase.functions.invoke('add-to-calendar', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          jobId: eventType === 'job' ? 'test-job-id' : undefined,
          invoiceId: eventType === 'invoice' ? 'test-invoice-id' : undefined,
          clientId: 'test-client-id',
          testMode: true,
          testData: {
            event: testObject,
            client: testClient
          },
          userId: user.id,
          userTimeZone: timezone
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.error) {
        addLog(`Error: ${data.message || data.error}`);
        throw new Error(data.message || data.error);
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create calendar event');
      }
      
      setCalendarEventId(data.eventId);
      setEvent(prev => ({ ...prev, calendarEventId: data.eventId }));
      
      toast.success('Calendar event created');
      addLog(`Event created with ID: ${data.eventId}`);

      setShowCalendarDialog(true);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      toast.error('Failed to create calendar event');
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCalendarEvent = async () => {
    if (!event.calendarEventId) {
      toast.error('No calendar event to update');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    
    try {
      setIsLoading(true);
      addLog(`Updating calendar event: ${event.calendarEventId}`);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      addLog(`Using timezone: ${userTimeZone}`);
      
      const formattedDate = format(event.date!, 'yyyy-MM-dd');
      
      const testClient = {
        id: "test-client-id",
        name: "Test Client",
        email: "test@example.com",
        phone: "555-1234",
        address: event.location || "123 Test Street"
      };
      
      const testObject = {
        title: event.title,
        description: event.description,
        date: formattedDate,
        location: event.location,
        isFullDay: event.isFullDay,
        startTime: event.isFullDay ? undefined : event.startTime,
        endTime: event.isFullDay ? undefined : event.endTime,
        calendarEventId: event.calendarEventId,
        timeZone: userTimeZone
      };
      
      const { data, error } = await supabase.functions.invoke('update-calendar-event', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          eventId: event.calendarEventId,
          testMode: true,
          testData: {
            event: testObject,
            client: testClient
          },
          userId: user.id,
          userTimeZone
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update calendar event');
      }
      
      toast.success('Calendar event updated');
      addLog(`Event updated: ${data.eventId}`);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      toast.error('Failed to update calendar event');
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCalendarEvent = async () => {
    if (!event.calendarEventId) {
      toast.error('No calendar event to delete');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    
    try {
      setIsLoading(true);
      addLog(`Deleting calendar event: ${event.calendarEventId}`);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      const { data, error } = await supabase.functions.invoke('delete-calendar-event', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          eventId: event.calendarEventId,
          userId: user.id
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete calendar event');
      }
      
      setCalendarEventId('');
      setEvent(prev => ({ ...prev, calendarEventId: undefined }));
      
      toast.success('Calendar event deleted');
      addLog('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      toast.error('Failed to delete calendar event');
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateGoogleCalendarUrl = () => {
    if (!event.title || !event.date) {
      toast.error('Title and date are required');
      return;
    }
    
    try {
      const formattedDate = event.date ? format(event.date, 'yyyy-MM-dd') : '';
      
      const title = encodeURIComponent(event.title);
      const description = encodeURIComponent(event.description);
      
      const location = encodeURIComponent(event.location);
      
      let dates = '';
      
      if (formattedDate) {
        if (event.isFullDay) {
          const dateWithoutDashes = formattedDate.replace(/-/g, '');
          dates = `${dateWithoutDashes}/${dateWithoutDashes}`;
        } else {
          const [year, month, day] = formattedDate.split('-').map(Number);
          
          const startDateLocal = new Date(year, month - 1, day);
          const endDateLocal = new Date(year, month - 1, day);
          
          const [startHours, startMinutes] = event.startTime.split(':').map(Number);
          const [endHours, endMinutes] = event.endTime.split(':').map(Number);
          
          startDateLocal.setHours(startHours, startMinutes, 0, 0);
          endDateLocal.setHours(endHours, endMinutes, 0, 0);
          
          const startDateTimeString = formatDateForGoogleCalendar(startDateLocal);
          const endDateTimeString = formatDateForGoogleCalendar(endDateLocal);
          
          dates = `${startDateTimeString}/${endDateTimeString}`;
        }
      }
      
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${description}&location=${location}&dates=${dates}&ctz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`;
      
      window.open(googleCalendarUrl, '_blank');
      addLog(`Opening calendar URL: ${googleCalendarUrl}`);
      
      toast.success('Google Calendar opened in new tab');
    } catch (error) {
      console.error('Error opening Google Calendar:', error);
      toast.error('Failed to open Google Calendar');
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleCalendarDialogClose = () => {
    setShowCalendarDialog(false);
  };

  const jobForDialog: Job = {
    id: 'test-job-id',
    clientId: 'test-client-id',
    companyId: 'test-company-id',
    title: event.title,
    description: event.description || '',
    status: 'active',
    date: event.date ? format(event.date, 'yyyy-MM-dd') : '',
    location: event.location,
    isFullDay: event.isFullDay,
    startTime: event.startTime,
    endTime: event.endTime,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timezone: timezone
  };

  const clientForDialog: Client = {
    id: 'test-client-id',
    name: 'Test Client',
    email: 'test@example.com',
    phone: '555-1234',
    address: event.location || '123 Test Street',
    createdAt: new Date().toISOString(),
    notes: 'Test client for calendar integration'
  };

  if (isCheckingIntegration) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 flex items-center">
          <Calendar className="mr-3 h-10 w-10 text-purple-600" />
          <h1 className="text-3xl font-bold">Calendar API Test</h1>
        </div>
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
          <span className="ml-3 text-lg">Checking calendar integration...</span>
        </div>
      </div>
    );
  }

  if (hasIntegration === false) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 flex items-center">
          <Calendar className="mr-3 h-10 w-10 text-purple-600" />
          <h1 className="text-3xl font-bold">Calendar API Test</h1>
        </div>
        
        <Alert variant="destructive" className="mb-8">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Google Calendar Integration Required</AlertTitle>
          <AlertDescription>
            <p className="mb-4">You haven't set up Google Calendar integration yet. Please connect your account in the Settings page first.</p>
            <Link to="/settings">
              <Button variant="outline">
                Go to Settings
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Setting Up Google Calendar Integration</CardTitle>
              <CardDescription>
                Follow these steps to connect your Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal pl-5 space-y-2">
                <li>Go to the Settings page</li>
                <li>Navigate to the "Integrations" tab</li>
                <li>Click on "Connect to Google Calendar"</li>
                <li>Follow the Google authentication prompts</li>
                <li>Return to this page after connecting</li>
              </ol>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] overflow-y-auto border rounded-md p-3 bg-slate-50">
                {logs.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div key={index} className="p-2 bg-white rounded border">
                        <div className="text-sm font-mono whitespace-pre-wrap break-words">
                          {log}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Link to="/settings" className="w-full">
                <Button className="w-full">Go to Settings</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <Calendar className="mr-3 h-10 w-10 text-purple-600" />
          <h1 className="text-3xl font-bold">Calendar API Test</h1>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={checkIntegration}
          disabled={isCheckingIntegration}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isCheckingIntegration ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>
      
      {integrationDetails && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CalendarCheck className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800">Integration Active</AlertTitle>
          <AlertDescription className="text-green-700">
            <p>Google Calendar integration is active and working.</p>
            <div className="text-xs mt-2">
              <p>Integration ID: <code className="bg-green-100 px-1">{integrationDetails.id}</code></p>
              <p>Last checked: {lastCheckedIntegration?.toLocaleTimeString()}</p>
              <p>Token expires: {new Date(integrationDetails.expires_at).toLocaleString()}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="create-event">
        <TabsList className="mb-4">
          <TabsTrigger value="create-event">Create Events</TabsTrigger>
          <TabsTrigger value="activity-log">Activity Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create-event">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Calendar Event
                </CardTitle>
                <CardDescription>
                  Test Google Calendar API integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select value={eventType} onValueChange={(value) => setEventType(value as 'job' | 'invoice')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job">Job</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={event.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Event title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={event.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Event description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={event.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Event location"
                  />
                </div>
                
                <div>
                  <Label>Date</Label>
                  <DatePicker
                    mode="single"
                    selected={event.date}
                    onSelect={(date) => handleInputChange('date', date)}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isFullDay"
                    checked={event.isFullDay}
                    onChange={(e) => handleInputChange('isFullDay', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isFullDay">Full Day Event</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="startTime"
                        type="time"
                        value={event.startTime}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                        disabled={event.isFullDay}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="endTime"
                        type="time"
                        value={event.endTime}
                        onChange={(e) => handleInputChange('endTime', e.target.value)}
                        disabled={event.isFullDay}
                      />
                    </div>
                  </div>
                </div>
                
                {event.calendarEventId && (
                  <div className="bg-slate-50 p-3 rounded-md">
                    <Label>Calendar Event ID</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input 
                        value={event.calendarEventId} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'Asia/Hong_Kong',
                        'Asia/Tokyo',
                        'Europe/London',
                        'America/New_York',
                        'America/Los_Angeles',
                        'UTC'
                      ].map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button 
                  onClick={createCalendarEvent} 
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
                
                <Button 
                  onClick={updateCalendarEvent} 
                  disabled={isLoading || !event.calendarEventId}
                  className="flex-1"
                  variant="outline"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Update Event
                </Button>
                
                <Button 
                  onClick={deleteCalendarEvent} 
                  disabled={isLoading || !event.calendarEventId}
                  className="flex-1"
                  variant="outline"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Event
                </Button>
                
                <Button 
                  onClick={generateGoogleCalendarUrl} 
                  disabled={isLoading}
                  className="flex-1"
                  variant="secondary"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Google Calendar
                </Button>
              </CardFooter>
            </Card>
            
            <div className="lg:block hidden">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Activity Log</CardTitle>
                  <CardDescription>
                    API operation results and debug information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] overflow-y-auto border rounded-md p-3 bg-slate-50">
                    {logs.length === 0 ? (
                      <p className="text-center text-gray-500 py-10">No activity yet</p>
                    ) : (
                      <div className="space-y-2">
                        {logs.map((log, index) => (
                          <div key={index} className="p-2 bg-white rounded border">
                            <div className="text-sm font-mono whitespace-pre-wrap break-words">
                              {log}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="activity-log">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                API operation results and debug information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] overflow-y-auto border rounded-md p-3 bg-slate-50">
                {logs.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div key={index} className="p-2 bg-white rounded border">
                        <div className="text-sm font-mono whitespace-pre-wrap break-words">
                          {log}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <AddToCalendarDialog 
        isOpen={showCalendarDialog}
        onClose={handleCalendarDialogClose}
        job={jobForDialog}
        client={clientForDialog}
      />
    </div>
  );
};

export default CalendarTest;
