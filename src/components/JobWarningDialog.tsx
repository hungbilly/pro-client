
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Job } from '@/types';
import { format } from 'date-fns';

interface JobWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  existingJobs: Job[];
  date: Date | null;
}

const JobWarningDialog: React.FC<JobWarningDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  existingJobs,
  date,
}) => {
  const formattedDate = date ? format(date, 'MMMM d, yyyy') : 'selected date';
  
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Scheduling Conflict Detected</AlertDialogTitle>
          <AlertDialogDescription>
            <p className="mb-4">
              You already have {existingJobs.length} job{existingJobs.length > 1 ? 's' : ''} scheduled on {formattedDate}:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-1">
              {existingJobs.map(job => (
                <li key={job.id} className="text-sm">
                  <span className="font-medium">{job.title}</span>
                  {job.isFullDay ? 
                    <span className="text-xs ml-2 text-muted-foreground">(Full Day)</span> : 
                    job.startTime && job.endTime ? 
                      <span className="text-xs ml-2 text-muted-foreground">({job.startTime} - {job.endTime})</span> : 
                      null
                  }
                </li>
              ))}
            </ul>
            <p>Are you sure you want to schedule another job on this day?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default JobWarningDialog;
