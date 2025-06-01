
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from './CompanySelector';

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
  onCalendarSelect 
}) => {
  const { user } = useAuth();
  const { companies } = useCompany();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [creating, setCreating] = useState(false);

  const company = companies[0];

  useEffect(() => {
    if (company && newCalendarName === '') {
      setNewCalendarName(`${company.name} - Business Calendar`);
    }
  }, [company, newCalendarName]);

  const fetchCalendars = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('list-google-calendars', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          userId: user.id
        },
      });

      if (error || !data) {
        throw new Error('Failed to fetch calendars');
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch calendars');
      }

      setCalendars(data.calendars || []);
      console.log('Fetched calendars:', data.calendars);
    } catch (error) {
      console.error('Error fetching calendars:', error);
      toast.error('Failed to fetch calendars');
    } finally {
      setLoading(false);
    }
  };

  const createCalendar = async () => {
    if (!user || !newCalendarName.trim()) return;
    
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('create-google-calendar', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          userId: user.id,
          calendarName: newCalendarName.trim(),
          description: `Business calendar for ${company?.name || 'your business'}`
        },
      });

      if (error || !data) {
        throw new Error('Failed to create calendar');
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to create calendar');
      }

      const newCalendar = data.calendar;
      setCalendars(prev => [...prev, newCalendar]);
      onCalendarSelect(newCalendar.id, newCalendar.summary);
      setShowCreateDialog(false);
      setNewCalendarName(company ? `${company.name} - Business Calendar` : '');
      toast.success('Calendar created successfully!');
    } catch (error) {
      console.error('Error creating calendar:', error);
      toast.error('Failed to create calendar');
    } finally {
      setCreating(false);
    }
  };

  const handleCalendarChange = (calendarId: string) => {
    const calendar = calendars.find(cal => cal.id === calendarId);
    if (calendar) {
      onCalendarSelect(calendarId, calendar.summary);
    }
  };

  const selectedCalendar = calendars.find(cal => cal.id === selectedCalendarId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Google Calendar</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCalendars}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="flex gap-2">
        <Select 
          value={selectedCalendarId || ''} 
          onValueChange={handleCalendarChange}
          disabled={loading || calendars.length === 0}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? "Loading calendars..." : "Select a calendar"}>
              {selectedCalendar ? selectedCalendar.summary : "Select a calendar"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {calendars.map(calendar => (
              <SelectItem key={calendar.id} value={calendar.id}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{calendar.summary}</span>
                  {calendar.primary && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Primary</span>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" disabled={loading}>
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Calendar</DialogTitle>
              <DialogDescription>
                Create a new Google Calendar for your business events.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="calendar-name">Calendar Name</Label>
                <Input
                  id="calendar-name"
                  value={newCalendarName}
                  onChange={(e) => setNewCalendarName(e.target.value)}
                  placeholder="Enter calendar name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createCalendar} 
                disabled={creating || !newCalendarName.trim()}
                className="gap-2"
              >
                {creating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Calendar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {selectedCalendar && (
        <div className="text-sm text-muted-foreground">
          Selected: <span className="font-medium">{selectedCalendar.summary}</span>
          {selectedCalendar.primary && <span className="ml-2 text-blue-600">(Primary)</span>}
        </div>
      )}
      
      {calendars.length === 0 && !loading && (
        <div className="text-sm text-muted-foreground">
          No calendars found. Click "Create New Calendar" to get started.
        </div>
      )}
    </div>
  );
};

export default CalendarSelector;
