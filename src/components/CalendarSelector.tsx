import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

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
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCalendarChange, setPendingCalendarChange] = useState<{
    calendarId: string;
    calendarName: string;
  } | null>(null);

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

  const handleCalendarChange = (calendarId: string) => {
    const calendar = calendars.find(cal => cal.id === calendarId);
    if (!calendar) return;

    // If there's already a selected calendar and it's different, show confirmation
    if (selectedCalendarId && selectedCalendarId !== calendarId) {
      setPendingCalendarChange({
        calendarId: calendar.id,
        calendarName: calendar.summary
      });
      setShowConfirmDialog(true);
    } else {
      // No previous selection or same calendar, proceed directly
      onCalendarSelect(calendar.id, calendar.summary);
    }
  };

  const confirmCalendarChange = () => {
    if (pendingCalendarChange) {
      onCalendarSelect(pendingCalendarChange.calendarId, pendingCalendarChange.calendarName);
    }
    setShowConfirmDialog(false);
    setPendingCalendarChange(null);
  };

  const cancelCalendarChange = () => {
    setShowConfirmDialog(false);
    setPendingCalendarChange(null);
  };

  useEffect(() => {
    fetchCalendars();
  }, [user]);

  const selectedCalendar = calendars.find(cal => cal.id === selectedCalendarId);

  return (
    <>
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
                  onValueChange={handleCalendarChange}
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

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Calendar Change
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to change your default calendar selection from{' '}
                <strong>{selectedCalendar?.summary}</strong> to{' '}
                <strong>{pendingCalendarChange?.calendarName}</strong>.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Existing jobs that were created with the previous calendar 
                  will remain in that calendar. Only new jobs will be created in the newly selected calendar. 
                  If you need to update existing events, you'll need to do so manually.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to proceed with this change?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelCalendarChange}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCalendarChange}>
              Yes, Change Calendar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CalendarSelector;
