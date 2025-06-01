
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
}

interface CalendarSelectorProps {
  selectedCalendarId?: string;
  onCalendarSelect: (calendarId: string, calendarName: string) => void;
}

const CalendarSelector: React.FC<CalendarSelectorProps> = ({
  selectedCalendarId,
  onCalendarSelect,
}) => {
  const { user } = useAuth();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');

  const fetchCalendars = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get the current session to include authorization header
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to access calendars');
        return;
      }

      const { data, error } = await supabase.functions.invoke('list-google-calendars', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching calendars:', error);
        toast.error(`Failed to fetch calendars: ${error.message}`);
        return;
      }

      if (data && data.items) {
        setCalendars(data.items);
        console.log('Fetched calendars:', data.items.length);
      }
    } catch (error) {
      console.error('Exception fetching calendars:', error);
      toast.error('Failed to fetch calendars');
    } finally {
      setLoading(false);
    }
  };

  const createCalendar = async () => {
    if (!user || !newCalendarName.trim()) return;

    try {
      setCreating(true);
      
      // Get the current session to include authorization header
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to create calendars');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-google-calendar', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          calendarName: newCalendarName.trim(),
        },
      });

      if (error) {
        console.error('Error creating calendar:', error);
        toast.error(`Failed to create calendar: ${error.message}`);
        return;
      }

      if (data) {
        toast.success('Calendar created successfully!');
        setNewCalendarName('');
        setShowCreateForm(false);
        
        // Refresh the calendars list
        await fetchCalendars();
        
        // Auto-select the newly created calendar
        onCalendarSelect(data.id, data.summary);
      }
    } catch (error) {
      console.error('Exception creating calendar:', error);
      toast.error('Failed to create calendar');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchCalendars();
  }, [user]);

  const selectedCalendar = calendars.find(cal => cal.id === selectedCalendarId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Select Calendar</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading calendars...</span>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="calendar-select">Choose Calendar</Label>
              <Select
                value={selectedCalendarId || ''}
                onValueChange={(value) => {
                  const calendar = calendars.find(cal => cal.id === value);
                  if (calendar) {
                    onCalendarSelect(calendar.id, calendar.summary);
                  }
                }}
              >
                <SelectTrigger id="calendar-select">
                  <SelectValue placeholder="Select a calendar..." />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      <div className="flex items-center gap-2">
                        <span>{calendar.summary}</span>
                        {calendar.primary && (
                          <span className="text-xs text-muted-foreground">(Primary)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCalendar && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>Selected:</strong> {selectedCalendar.summary}
                  {selectedCalendar.description && (
                    <span className="block text-green-600 mt-1">
                      {selectedCalendar.description}
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              {!showCreateForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Calendar
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-calendar-name">Calendar Name</Label>
                    <Input
                      id="new-calendar-name"
                      value={newCalendarName}
                      onChange={(e) => setNewCalendarName(e.target.value)}
                      placeholder="Enter calendar name..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCalendarName.trim()) {
                          createCalendar();
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={createCalendar}
                      disabled={!newCalendarName.trim() || creating}
                      className="flex-1"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewCalendarName('');
                      }}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarSelector;
