
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Client, Job } from '@/types';
import { formatDateForGoogleCalendar } from '@/lib/utils';

interface AddToCalendarDialogProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  client: Client | null;
}

const AddToCalendarDialog: React.FC<AddToCalendarDialogProps> = ({ 
  isOpen, 
  onClose, 
  job, 
  client 
}) => {
  const openGoogleCalendar = () => {
    if (!job || !client) return;
    
    try {
      // Format the date and time for Google Calendar URL
      const formattedDate = job.date || '';
      
      // Set default title and description
      const title = encodeURIComponent(`${job.title} - ${client.name}`);
      const description = encodeURIComponent(`Job: ${job.description || ''}\n\nClient: ${client.name}\nEmail: ${client.email}\nPhone: ${client.phone}`);
      
      // Set location if available
      const location = encodeURIComponent(job.location || client.address || '');
      
      // Format dates for Google Calendar in proper format
      let dates = '';
      
      if (formattedDate) {
        if (job.isFullDay) {
          // For all-day events, use date format without time component (YYYYMMDD)
          // Remove dashes from the date
          const dateWithoutDashes = formattedDate.replace(/-/g, '');
          dates = `${dateWithoutDashes}/${dateWithoutDashes}`;
        } else {
          // For events with time, properly handle timezone conversion
          
          // Get start and end times, defaulting to business hours if not provided
          const startTime = job.startTime || '09:00';
          const endTime = job.endTime || '17:00';
          
          // Parse the date parts
          const [year, month, day] = formattedDate.split('-').map(Number);
          
          // Create local date objects for start and end times
          const startDateLocal = new Date(year, month - 1, day);
          const endDateLocal = new Date(year, month - 1, day);
          
          // Parse hours and minutes from time strings
          const [startHours, startMinutes] = startTime.split(':').map(Number);
          const [endHours, endMinutes] = endTime.split(':').map(Number);
          
          // Set hours and minutes to the local date objects
          startDateLocal.setHours(startHours, startMinutes, 0, 0);
          endDateLocal.setHours(endHours, endMinutes, 0, 0);
          
          // Format dates in the way Google Calendar expects
          // Format: YYYYMMDDTHHMMSS for each date/time
          const formatLocalDateTime = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = '00';
            
            return `${year}${month}${day}T${hours}${minutes}${seconds}`;
          };
          
          const startDateTimeString = formatLocalDateTime(startDateLocal);
          const endDateTimeString = formatLocalDateTime(endDateLocal);
          
          dates = `${startDateTimeString}/${endDateTimeString}`;
        }
      }
      
      // Construct Google Calendar URL
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${description}&location=${location}&dates=${dates}&ctz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`;
      
      // Open Google Calendar in a new tab
      window.open(googleCalendarUrl, '_blank');
      
      toast.success('Google Calendar opened in new tab');
    } catch (error) {
      console.error('Error opening Google Calendar:', error);
      toast.error('Failed to open Google Calendar');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Add to Google Calendar
          </DialogTitle>
          <DialogDescription>
            Would you like to add this job to your Google Calendar?
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
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Skip
          </Button>
          <Button 
            onClick={openGoogleCalendar} 
            className="gap-2"
          >
            Open Google Calendar
            <ExternalLink className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCalendarDialog;
