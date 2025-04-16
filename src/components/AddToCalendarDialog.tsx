
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
  onSuccess?: (calendarEventId: string | null) => void; // Callback to update the job with the event ID
  onError?: (error: Error) => void; // Callback to handle errors
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

      const { data, error } = await supabase.functions.invoke('add-to-calendar', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          jobId: job.id,
          clientId: client.id,
          userId: session.user.id
        },
      });

      if (error || !data) {
        throw new Error('Failed to create calendar event');
      }

      if (!data.success) {
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

      const { data, error } = await supabase.functions.invoke('update-calendar-event', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          eventId: job.calendarEventId,
          userId: session.user.id,
          jobData: {
            title: job.title,
            description: job.description || '',
            date: job.date || '',
            location: job.location || '',
            start_time: job.startTime || '',
            end_time: job.endTime || '',
            is_full_day: job.isFullDay || false
          }
        },
      });

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
      // Get the current session
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Log initial session attempt
      console.log('Initial session attempt:', {
        sessionExists: !!session,
        sessionError: sessionError?.message,
        currentTime: new Date().toISOString(),
      });

      // Attempt to refresh the session if it doesn't exist or is expired
      if (sessionError || !session || !session.access_token) {
        console.log('No valid session, attempting to refresh...');
        const { data, error } = await supabase.auth.refreshSession();
        session = data?.session || null;
        sessionError = error;

        console.log('Session refresh attempt:', {
          sessionExists: !!session,
          refreshError: sessionError?.message,
          currentTime: new Date().toISOString(),
        });
      }

      // Ensure we have a valid session
      if (!session || !session.access_token) {
        console.error('Failed to retrieve or refresh session:', sessionError);
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
        return;
      }

      // Ensure we have a user ID
      const userId = user?.id || session?.user?.id;
      if (!userId) {
        console.error('No user ID available:', { userFromContext: user?.id, userFromSession: session?.user?.id });
        throw new Error('User authentication required');
      }

      // Log session details
      console.log('Session details:', {
        hasUser: !!session.user,
        userId: userId,
        accessTokenLength: session.access_token?.length,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown',
        expiresInSeconds: session.expires_in,
        currentTime: new Date().toISOString(),
      });

      // Decode the JWT token for debugging
      const decodeJwt = (token: string) => {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          return JSON.parse(jsonPayload);
        } catch (error) {
          console.error('Error decoding JWT in frontend:', error);
          return null;
        }
      };

      const decodedToken = decodeJwt(session.access_token);
      if (decodedToken) {
        const now = Math.floor(Date.now() / 1000);
        const isExpired = decodedToken.exp < now;
        console.log('Frontend JWT payload:', {
          sub: decodedToken.sub,
          exp: decodedToken.exp ? new Date(decodedToken.exp * 1000).toISOString() : null,
          iss: decodedToken.iss,
          aud: decodedToken.aud,
          isExpired: isExpired,
          currentTime: new Date(now * 1000).toISOString(),
        });

        if (isExpired) {
          console.log('Token is expired, forcing a refresh...');
          const { data, error } = await supabase.auth.refreshSession();
          session = data?.session || null;
          sessionError = error;

          console.log('Session refresh attempt after expiry:', {
            sessionExists: !!session,
            refreshError: sessionError?.message,
            currentTime: new Date().toISOString(),
          });

          if (sessionError || !session || !session.access_token) {
            console.error('Failed to refresh session:', sessionError);
            toast.error('Session expired. Please log in again.');
            window.location.href = '/login';
            return;
          }

          const newDecodedToken = decodeJwt(session.access_token);
          console.log('Refreshed JWT payload:', {
            sub: newDecodedToken.sub,
            exp: newDecodedToken.exp ? new Date(newDecodedToken.exp * 1000).toISOString() : null,
            iss: newDecodedToken.iss,
            aud: newDecodedToken.aud,
          });
        }
      } else {
        console.log('Failed to decode JWT in frontend');
      }

      // Log the request data
      const requestBody = {
        eventId: job.calendarEventId,
        jobId: job.id,
        userId: userId,
      };
      console.log('Deleting calendar event with data:', requestBody);

      // Set up request options
      const fetchOptions = {
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
        body: requestBody,
      };

      console.log('Sending Authorization header with token:', session.access_token ? 'Bearer <token present>' : 'No token');

      // Call the function
      const { data, error } = await supabase.functions.invoke('delete-calendar-event', fetchOptions);

      // Handle errors from function invocation
      if (error) {
        console.error('Function invocation error:', error);
        throw new Error(`Failed to delete calendar event: ${error.message}`);
      }

      // Handle errors returned in the response data
      if (!data || !data.success) {
        const message = data?.message || 'Failed to delete calendar event';
        console.error('Function returned error:', message);
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
