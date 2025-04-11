
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, CalendarCheck, CalendarX, Clock, Edit, Plus, Trash, ExternalLink } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { formatDateForGoogleCalendar } from '@/lib/utils';
import { AddToCalendarDialog } from '@/components/AddToCalendarDialog';

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

const CalendarTest = () => {
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

  const addLog = (message: string) => {
    setLogs(prev => [message, ...prev.slice(0, 9)]);
  };

  const handleInputChange = (field: keyof CalendarEvent, value: any) => {
    setEvent(prev => ({ ...prev, [field]: value }));
  };

  const createCalendarEvent = async () => {
    if (!event.title || !event.date) {
      toast.error('Title and date are required');
      return;
    }

    try {
      setIsLoading(true);
      addLog(`Creating calendar event: ${event.title}`);
      
      // Create a fake client for testing purposes
      const testClient = {
        id: "test-client-id",
        name: "Test Client",
        email: "test@example.com",
        phone: "555-1234",
        address: event.location || "123 Test Street"
      };

      // Format date for API
      const formattedDate = format(event.date, 'yyyy-MM-dd');
      
      // Create a test job/invoice object for the API
      const testObject = {
        title: event.title,
        description: event.description,
        date: formattedDate,
        location: event.location,
        isFullDay: event.isFullDay,
        startTime: event.isFullDay ? undefined : event.startTime,
        endTime: event.isFullDay ? undefined : event.endTime,
      };
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      // Call the edge function
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
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create calendar event');
      }
      
      // Store the Google Calendar event ID for later use
      setCalendarEventId(data.eventId);
      setEvent(prev => ({ ...prev, calendarEventId: data.eventId }));
      
      toast.success('Calendar event created');
      addLog(`Event created with ID: ${data.eventId}`);

      // Show the calendar dialog after successful creation
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
    
    try {
      setIsLoading(true);
      addLog(`Updating calendar event: ${event.calendarEventId}`);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      // Format date for API
      const formattedDate = format(event.date!, 'yyyy-MM-dd');
      
      // Create a test client for testing purposes
      const testClient = {
        id: "test-client-id",
        name: "Test Client",
        email: "test@example.com",
        phone: "555-1234",
        address: event.location || "123 Test Street"
      };
      
      // Create a test job/invoice object for the API
      const testObject = {
        title: event.title,
        description: event.description,
        date: formattedDate,
        location: event.location,
        isFullDay: event.isFullDay,
        startTime: event.isFullDay ? undefined : event.startTime,
        endTime: event.isFullDay ? undefined : event.endTime,
        calendarEventId: event.calendarEventId
      };
      
      // Call the edge function
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
          }
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
    
    try {
      setIsLoading(true);
      addLog(`Deleting calendar event: ${event.calendarEventId}`);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('delete-calendar-event', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          eventId: event.calendarEventId
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
      // Format date objects for Google Calendar URL
      const formattedDate = event.date ? format(event.date, 'yyyy-MM-dd') : '';
      
      // Set default title and description
      const title = encodeURIComponent(event.title);
      const description = encodeURIComponent(event.description);
      
      // Set location if available
      const location = encodeURIComponent(event.location);
      
      let dates = '';
      
      if (formattedDate) {
        if (event.isFullDay) {
          // For all-day events
          const dateWithoutDashes = formattedDate.replace(/-/g, '');
          dates = `${dateWithoutDashes}/${dateWithoutDashes}`;
        } else {
          // For events with time
          const [year, month, day] = formattedDate.split('-').map(Number);
          
          // Create local date objects
          const startDateLocal = new Date(year, month - 1, day);
          const endDateLocal = new Date(year, month - 1, day);
          
          // Parse hours and minutes from time strings
          const [startHours, startMinutes] = event.startTime.split(':').map(Number);
          const [endHours, endMinutes] = event.endTime.split(':').map(Number);
          
          // Set hours and minutes
          startDateLocal.setHours(startHours, startMinutes, 0, 0);
          endDateLocal.setHours(endHours, endMinutes, 0, 0);
          
          // Format using the utility function
          const startDateTimeString = formatDateForGoogleCalendar(startDateLocal);
          const endDateTimeString = formatDateForGoogleCalendar(endDateLocal);
          
          dates = `${startDateTimeString}/${endDateTimeString}`;
        }
      }
      
      // Construct Google Calendar URL
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${description}&location=${location}&dates=${dates}&ctz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`;
      
      // Open Google Calendar in a new tab
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center">
        <Calendar className="mr-3 h-10 w-10 text-purple-600" />
        <h1 className="text-3xl font-bold">Calendar API Test</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
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
        </div>
        
        <div>
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
                        <div className="text-xs text-gray-500 pb-1">
                          {new Date().toLocaleTimeString()}
                        </div>
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
      
      {/* Google Calendar Dialog */}
      <AddToCalendarDialog 
        isOpen={showCalendarDialog}
        onClose={handleCalendarDialogClose}
        job={{
          id: 'test-job-id',
          title: event.title,
          description: event.description,
          date: event.date ? format(event.date, 'yyyy-MM-dd') : '',
          location: event.location,
          isFullDay: event.isFullDay,
          startTime: event.startTime,
          endTime: event.endTime,
        }}
        client={{
          id: 'test-client-id',
          name: 'Test Client',
          email: 'test@example.com',
          phone: '555-1234',
          address: event.location || '123 Test Street',
        }}
      />
    </div>
  );
};

export default CalendarTest;
