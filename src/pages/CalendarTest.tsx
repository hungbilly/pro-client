import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar as CalendarIcon, CalendarPlus, Pencil, Copy, Package as PackageIcon, AlertCircle, Briefcase, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { useCompany } from '@/components/CompanySelector';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types';

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  status?: 'active' | 'completed' | 'cancelled';
  isFullDay?: boolean;
}

const localizer = momentLocalizer(moment);

const CalendarTest = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState<Date>(new Date());
  const [end, setEnd] = useState<Date>(new Date());
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [isFullDay, setIsFullDay] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompanyId } = useCompany();
  const { user } = useAuth();

  useEffect(() => {
    fetchEvents();
  }, [selectedCompanyId, user]);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!selectedCompanyId || !user) {
        console.warn('Company ID or User not available. Skipping fetch.');
        return;
      }

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', selectedCompanyId);

      if (error) {
        setError(error.message);
        return;
      }

      const fetchedEvents = data.map(event => ({
        id: event.calendar_event_id || event.id,
        title: event.title,
        start: parseISO(event.date),
        end: parseISO(event.date),
        location: event.location,
        status: event.status,
        isFullDay: event.is_full_day
      }));

      setEvents(fetchedEvents);
    } catch (error) {
      setError('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slotInfo: any) => {
    setTitle('');
    setStart(slotInfo.start);
    setEnd(slotInfo.end);
    setLocation('');
    setStatus('active');
    setIsFullDay(false);
    setSelectedEvent(null);
  };

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setTitle(event.title);
    setStart(event.start);
    setEnd(event.end);
    setLocation(event.location || '');
    setStatus(event.status as 'active' | 'completed' | 'cancelled' || 'active');
    setIsFullDay(event.isFullDay || false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    if (name === 'title') setTitle(value);
    if (name === 'location') setLocation(value);
    if (name === 'status') setStatus(value as 'active' | 'completed' | 'cancelled');
    if (name === 'isFullDay') setIsFullDay(type === 'checkbox' ? checked : false);
  };

  const handleDateChange = (date: Date, field: 'start' | 'end') => {
    if (field === 'start') setStart(date);
    if (field === 'end') setEnd(date);
  };

  const handleEventCreation = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!selectedCompanyId || !user) {
        setError('Company ID or User not available.');
        return;
      }

      // Mock client and job data for testing
      const mockClient = {
        id: "test-client-id",
        name: "Test Client",
        email: "test@example.com",
        phone: "123-456-7890",
        address: "123 Test St",
        createdAt: new Date().toISOString(),
        notes: "",
        companyId: "test-company-id" // Add this line to fix the error
      };

      const mockJob = {
        clientId: mockClient.id,
        companyId: selectedCompanyId,
        title: title,
        status: status,
        date: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        endTime: format(end, 'HH:mm'),
        location: location,
        isFullDay: isFullDay,
        createdAt: new Date().toISOString()
      };

      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert([mockJob])
        .select()
        .single();

      if (jobError) {
        setError(jobError.message);
        return;
      }

      const newEvent: Event = {
        id: jobData.id,
        title: title,
        start: start,
        end: end,
        location: location,
        status: status,
        isFullDay: isFullDay
      };

      setEvents([...events, newEvent]);
      toast.success('Event created successfully!');
    } catch (error) {
      setError('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  // Fix the client mock data in handleEventUpdate function
  const handleEventUpdate = async (eventId: string, data: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const { title, start, end, location, status, isFullDay } = data;
      
      // Mock client and job data for testing
      const mockClient = {
        id: "test-client-id",
        name: "Test Client",
        email: "test@example.com",
        phone: "123-456-7890",
        address: "123 Test St",
        createdAt: new Date().toISOString(),
        notes: "",
        companyId: "test-company-id" // Add this line to fix the error
      };
      
      const mockJob = {
        id: "test-job-id",
        clientId: mockClient.id,
        companyId: "test-company-id",
        title: title || "Test Job",
        status: status || "active",
        date: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        endTime: format(end, 'HH:mm'),
        location: location || "Test Location",
        isFullDay: isFullDay || false,
        calendarEventId: eventId,
        createdAt: new Date().toISOString()
      };
      
      // Update the event in the database
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          title: title,
          date: format(start, 'yyyy-MM-dd'),
          startTime: format(start, 'HH:mm'),
          endTime: format(end, 'HH:mm'),
          location: location,
          status: status,
          is_full_day: isFullDay
        })
        .eq('calendar_event_id', eventId);
      
      if (updateError) {
        setError(updateError.message);
        return;
      }
      
      // Update the event in the local state
      setEvents(events =>
        events.map(event =>
          event.id === eventId ? { ...event, title, start, end, location, status, isFullDay } : event
        )
      );
      
      toast.success('Event updated successfully!');
    } catch (error) {
      setError('Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  const handleEventDeletion = async (eventId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .eq('calendar_event_id', eventId);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setEvents(events.filter(event => event.id !== eventId));
      toast.success('Event deleted successfully!');
    } catch (error) {
      setError('Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <Card className="w-full max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>View and manage your events.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && <div className="text-red-500">{error}</div>}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-1/2 space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                type="text"
                id="title"
                name="title"
                value={title}
                onChange={handleInputChange}
              />

              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {start ? format(start, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePicker
                    mode="single"
                    selected={start}
                    onSelect={(date) => date && handleDateChange(date, 'start')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {end ? format(end, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePicker
                    mode="single"
                    selected={end}
                    onSelect={(date) => date && handleDateChange(date, 'end')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Label htmlFor="location">Location</Label>
              <Input
                type="text"
                id="location"
                name="location"
                value={location}
                onChange={handleInputChange}
              />

              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => handleInputChange({ target: { name: 'status', value } } as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <Input
                  type="checkbox"
                  id="isFullDay"
                  name="isFullDay"
                  checked={isFullDay}
                  onChange={handleInputChange}
                />
                <Label htmlFor="isFullDay">Full Day</Label>
              </div>

              <Button onClick={handleEventCreation} disabled={loading}>
                {loading ? 'Loading...' : 'Create Event'}
              </Button>
              {selectedEvent && (
                <Button onClick={() => handleEventDeletion(selectedEvent.id)} disabled={loading} variant="destructive">
                  {loading ? 'Loading...' : 'Delete Event'}
                </Button>
              )}
            </div>
            <div className="md:w-1/2">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 500 }}
                selectable={true}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                onEventDrop={({ event, start, end, isAllDay }) => {
                  handleEventUpdate(event.id, {
                    title: event.title,
                    start: start,
                    end: end,
                    location: event.location,
                    status: event.status,
                    isFullDay: isAllDay
                  });
                }}
                eventPropGetter={(event) => ({
                  style: {
                    backgroundColor:
                      event.status === 'completed' ? '#4CAF50' :
                        event.status === 'cancelled' ? '#F44336' : '#2196F3',
                    color: 'white',
                  },
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarTest;
