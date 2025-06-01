
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Trash, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Job, Client } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface AddToCalendarDialogProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  client: Client | null;
  onSuccess?: (calendarEventId: string | null) => void;
  onError?: (error: Error) => void;
}

export const AddToCalendarDialog: React.FC<AddToCalendarDialogProps> = ({ 
  isOpen, 
  onClose, 
  job, 
  client,
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  
  const handleAddToCalendar = async () => {
    if (!job || !client) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Use job's timezone if available, otherwise use user's browser timezone
      const timeZoneToUse = job.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log(`Creating calendar event with timezone: ${timeZoneToUse}`);
      console.log(`Job start time: ${job.startTime}, Job end time: ${job.endTime}`);
      
      const { data, error } = await supabase.functions.invoke('add-to-calendar', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          jobId: job.id,
          clientId: client.id,
          userId: session.user.id,
          userTimeZone: timeZoneToUse,
          // Explicitly include start and end times to ensure they're passed correctly
          jobData: {
            title: job.title,
            description: job.description || '',
            date: job.date || '',
            location: job.location || '',
            startTime: job.startTime || '09:00',
            endTime: job.endTime || '17:00',
            isFullDay: job.isFullDay || false,
            timezone: timeZoneToUse
          }
        },
      });

      if (error || !data) {
        console.error('Error response from add-to-calendar:', error || 'No data returned');
        throw new Error('Failed to create calendar event');
      }

      if (!data.success) {
        console.error('Calendar API returned error:', data.message || 'Unknown error');
        throw new Error(data.message || 'Failed to create calendar event');
      }

      const eventId = data.eventId;
      if (!eventId) {
        throw new Error('No event ID returned from calendar creation');
      }

      toast.success('Calendar event added successfully!');
      if (onSuccess) {
        onSuccess(eventId);
      }
      onClose();
    } catch (error) {
      console.error('Error adding to calendar:', error);
      toast.error('Failed to add to calendar');
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCalendarEvent = async () => {
    if (!job || !client || !job.calendarEventId) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Use job's timezone if available, otherwise use user's browser timezone
      const timeZoneToUse = job.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log(`Updating calendar event with timezone: ${timeZoneToUse}`);
      console.log(`Job start time: ${job.startTime}, Job end time: ${job.endTime}`);
      
      const { data, error } = await supabase.functions.invoke('update-calendar-event', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          eventId: job.calendarEventId,
          userId: session.user.id,
          jobId: job.id, // Pass the job ID so the function can get the stored calendar ID
          timeZone: timeZoneToUse,
          jobData: {
            title: job.title,
            description: job.description || '',
            date: job.date || '',
            location: job.location || '',
            // Ensure we're sending the correct time format
            start_time: job.startTime || '09:00:00',
            end_time: job.endTime || '17:00:00',
            is_full_day: job.isFullDay || false,
            timeZone: timeZoneToUse // Explicitly pass timezone again in job data
          }
        },
      });

      console.log('Update calendar event response:', data, error);

      if (error || !data) {
        throw new Error('Failed to update calendar event');
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to update calendar event');
      }

      toast.success('Calendar event updated successfully!');
      if (onSuccess) {
        onSuccess(data.eventId);
      }
      onClose();
    } catch (error) {
      console.error('Error updating calendar event:', error);
      toast.error('Failed to update calendar event');
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCalendarEvent = async () => {
    if (!job || !job.calendarEventId) return;
    setIsLoading(true);
    try {
      console.log(`Attempting to delete calendar event ID: ${job.calendarEventId}`);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Error getting session:', sessionError || 'No session found');
        throw new Error('Authentication required. Please log in and try again.');
      }
      
      const userId = user?.id || session.user?.id;
      
      if (!userId) {
        console.error('No user ID available');
        throw new Error('User authentication required');
      }
      
      console.log('Preparing delete request with user ID:', userId);
      
      const { data, error } = await supabase.functions.invoke('delete-calendar-event', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          eventId: job.calendarEventId,
          jobId: job.id, // Pass the job ID so the function can get the stored calendar ID
          userId: userId
        }
      });
      
      console.log('Delete calendar event response:', { data, error });
      
      if (error) {
        console.error('Error invoking delete-calendar-event function:', error);
        throw new Error(`Failed to delete calendar event: ${error.message}`);
      }
      
      if (!data || !data.success) {
        const message = data?.message || 'Failed to delete calendar event';
        console.error('Error response from delete-calendar-event function:', message);
        throw new Error(message);
      }
      
      toast.success('Calendar event deleted successfully!');
      if (onSuccess) {
        onSuccess(null); // Clear the calendarEventId
      }
      onClose();
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      toast.error(`Failed to delete calendar event: ${error instanceof Error ? error.message : String(error)}`);
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = () => {
    if (!job) return;
    if (job.calendarEventId) {
      handleUpdateCalendarEvent();
    } else {
      handleAddToCalendar();
    }
  };

  // Get the job timezone or fall back to browser timezone
  const displayTimezone = job?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {job?.calendarEventId ? 'Update Calendar Event' : 'Add to Calendar'}
          </DialogTitle>
          <DialogDescription>
            {job?.calendarEventId
              ? 'Update or delete this job in your Google Calendar.'
              : 'Add this job to your Google Calendar.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Event details:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium">Title:</span> {job?.title}</li>
              <li><span className="font-medium">Date:</span> {job?.date}</li>
              <li><span className="font-medium">Client:</span> {client?.name}</li>
              {job?.location && (
                <li><span className="font-medium">Location:</span> {job?.location}</li>
              )}
              <li><span className="font-medium">Timezone:</span> {displayTimezone}</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
          <div className="flex space-x-2 mt-3 sm:mt-0">
            {job?.calendarEventId && (
              <Button
                variant="destructive"
                onClick={handleDeleteCalendarEvent}
                disabled={isLoading}
                className="gap-2"
              >
                <Trash className="h-4 w-4" />
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
          <Button
            onClick={handleAction}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              'Processing...'
            ) : job?.calendarEventId ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Update Event
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                Add to Calendar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
