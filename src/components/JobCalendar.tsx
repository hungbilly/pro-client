
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, isSameMonth, isAfter, isBefore, parseISO, addMonths, subMonths, isSameDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Job } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface JobCalendarProps {
  jobs: Job[];
}

const JobCalendar: React.FC<JobCalendarProps> = ({ jobs }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [jobDates, setJobDates] = useState<Record<string, Job[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showJobsDialog, setShowJobsDialog] = useState<boolean>(false);
  const [selectedDateJobs, setSelectedDateJobs] = useState<Job[]>([]);
  
  // Calculate date boundaries for the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Update job dates map when jobs or current month changes
  useEffect(() => {
    const datesMap: Record<string, Job[]> = {};
    
    jobs.forEach(job => {
      if (!job.date) return;
      
      try {
        const jobDate = parseISO(job.date);
        const dateStr = format(jobDate, 'yyyy-MM-dd');
        
        if (!datesMap[dateStr]) {
          datesMap[dateStr] = [];
        }
        
        datesMap[dateStr].push(job);
      } catch (error) {
        console.error('Error parsing job date:', job.date);
      }
    });
    
    setJobDates(datesMap);
  }, [jobs, currentMonth]);
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // Go to current month
  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };
  
  // Count upcoming and completed jobs for the current month
  const upcomingJobs = jobs.filter(job => {
    if (!job.date) {
      return false;
    }
    
    try {
      const jobDate = parseISO(job.date);
      
      // Consider any active job in the current month as "upcoming"
      // regardless of date, as long as it's not completed or cancelled
      return (
        isSameMonth(jobDate, currentMonth) && 
        job.status === 'active'
      );
    } catch (e) {
      console.error('Error filtering upcoming jobs:', e, job);
      return false;
    }
  });
  
  const completedJobs = jobs.filter(job => {
    if (!job.date) {
      return false;
    }
    
    try {
      const jobDate = parseISO(job.date);
      
      // A completed job is in the current month and has 'completed' status
      return (
        isSameMonth(jobDate, currentMonth) &&
        job.status === 'completed'
      );
    } catch (e) {
      console.error('Error filtering completed jobs:', e, job);
      return false;
    }
  });

  console.log('Current month:', format(currentMonth, 'MMMM yyyy'));
  console.log('Total jobs:', jobs.length);
  console.log('Raw jobs data:', jobs.map(j => ({ title: j.title, date: j.date, status: j.status })));
  console.log('Upcoming jobs:', upcomingJobs.length, upcomingJobs.map(j => j.title));
  console.log('Completed jobs:', completedJobs.length, completedJobs.map(j => j.title));
  
  // Handle day click to show jobs for that day
  const handleDayClick = (day: Date | undefined) => {
    if (!day) return;
    
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayJobs = jobDates[dateStr] || [];
    
    setSelectedDate(day);
    setSelectedDateJobs(dayJobs);
    setShowJobsDialog(true);
  };
  
  // Custom day content function to show job count
  const dayContent = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayJobs = jobDates[dateStr] || [];
    
    if (dayJobs.length === 0) return null;
    
    return (
      <div className="absolute bottom-0 right-0 flex h-2 w-2">
        <Badge variant="outline" className="absolute bottom-0 right-0 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[0.5rem] bg-primary text-primary-foreground">
          {dayJobs.length}
        </Badge>
      </div>
    );
  };
  
  return (
    <>
      <Card className="w-full backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">Job Schedule</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToPreviousMonth}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={goToCurrentMonth}
              className="h-7 px-2 text-xs"
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToNextMonth}
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <h2 className="text-lg font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex gap-4">
                <div className="text-sm">
                  <span className="font-medium text-blue-600">{upcomingJobs.length}</span> upcoming
                </div>
                <div className="text-sm">
                  <span className="font-medium text-green-600">{completedJobs.length}</span> completed
                </div>
              </div>
            </div>
          </div>
          
          <Calendar
            mode="single"
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            selected={undefined}
            onSelect={handleDayClick}
            className="rounded-md border"
            components={{
              DayContent: ({ date }) => (
                <div className="relative w-full h-full flex items-center justify-center">
                  {date.getDate()}
                  {dayContent(date)}
                </div>
              ),
            }}
            modifiersClassNames={{
              hasJob: "bg-primary/10"
            }}
            modifiers={{
              hasJob: (date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                return !!jobDates[dateStr]?.length;
              }
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={showJobsDialog} onOpenChange={setShowJobsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Job Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedDateJobs.length > 0 
                ? `${selectedDateJobs.length} job(s) scheduled for this day`
                : 'No jobs scheduled for this day'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto py-4">
            {selectedDateJobs.length > 0 ? (
              <div className="space-y-4">
                {selectedDateJobs.map((job) => (
                  <Card key={job.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-lg">{job.title}</h3>
                          <Badge className={
                            job.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : job.status === 'cancelled' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-blue-100 text-blue-800'
                          }>
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </Badge>
                        </div>
                        
                        {job.location && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Location:</span> {job.location}
                          </div>
                        )}
                        
                        {job.startTime && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Time:</span> {job.startTime} {job.endTime ? `- ${job.endTime}` : ''}
                          </div>
                        )}
                        
                        {job.description && (
                          <div className="text-sm mt-2">
                            <span className="font-medium">Description:</span>
                            <p className="mt-1 text-muted-foreground">{job.description}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No jobs scheduled for this day</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default JobCalendar;
