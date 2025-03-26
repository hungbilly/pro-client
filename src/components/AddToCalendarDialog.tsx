
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Client, Job } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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
  const [isAdding, setIsAdding] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  const addToCalendar = async () => {
    if (!job || !client) return;

    setIsAdding(true);
    setIsSuccess(false);
    setIsError(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('add-to-calendar', {
        body: { 
          jobId: job.id,
          clientId: client.id
        }
      });

      if (error) {
        console.error('Error adding to calendar:', error);
        setIsError(true);
        toast.error('Failed to add to calendar.');
      } else {
        setIsSuccess(true);
        toast.success('Event added to Google Calendar!');
      }
    } catch (error) {
      console.error('Error invoking add-to-calendar function:', error);
      setIsError(true);
      toast.error('Failed to add to calendar.');
    } finally {
      setIsAdding(false);
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
          {!isSuccess && !isError && (
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
          )}
          
          {isSuccess && (
            <div className="flex items-center gap-3 p-3 bg-green-50 text-green-700 rounded-md">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">Successfully added to your Google Calendar.</p>
            </div>
          )}
          
          {isError && (
            <div className="flex items-center gap-3 p-3 bg-red-50 text-red-700 rounded-md">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">Failed to add to Google Calendar. Please try again later.</p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {!isSuccess ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={isAdding}>
                Skip
              </Button>
              <Button 
                onClick={addToCalendar} 
                disabled={isAdding || isSuccess} 
                className="gap-2"
              >
                {isAdding ? "Adding..." : "Add to Calendar"}
                <Calendar className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCalendarDialog;
