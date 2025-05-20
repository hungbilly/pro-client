
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, isSameMonth, isAfter, isBefore, parseISO, addMonths, subMonths, isSameDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Job } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      
      // An upcoming job is in the current month, not cancelled, and in the future or today
      return (
        isSameMonth(jobDate, currentMonth) && 
        job.status !== 'cancelled' &&
        job.status !== 'completed' &&
        (isAfter(jobDate, today) || isSameDay(jobDate, today))
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
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      
      // Count jobs as completed if:
      // 1. They have 'completed' status, or
      // 2. Their date is in the past (but still in the current month) and not cancelled
      return (
        isSameMonth(jobDate, currentMonth) &&
        (job.status === 'completed' || 
          (isBefore(jobDate, today) && !isSameDay(jobDate, today) && job.status !== 'cancelled'))
      );
    } catch (e) {
      console.error('Error filtering completed jobs:', e, job);
      return false;
    }
  });

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
        <Badge variant="outline" className="absolute bottom-0 right-0 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[0.5rem] bg-indigo-500 text-white border-indigo-300">
          {dayJobs.length}
        </Badge>
      </div>
    );
  };

  // Get all jobs for the current month
  const currentMonthJobs = jobs.filter(job => {
    if (!job.date) return false;
    try {
      const jobDate = parseISO(job.date);
      return isSameMonth(jobDate, currentMonth);
    } catch (e) {
      return false;
    }
  }).sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  return (
    <>
      <Card className="w-full backdrop-blur-sm bg-gradient-to-br from-indigo-50/90 to-violet-50/80 border-transparent shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-indigo-100/50 to-violet-100/50 rounded-t-lg">
          <CardTitle className="text-md font-medium text-indigo-800">Job Schedule</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToPreviousMonth}
              className="h-7 w-7 bg-white/70 hover:bg-indigo-100 border-indigo-200"
            >
              <ChevronLeft className="h-4 w-4 text-indigo-600" />
            </Button>
            <Button 
              variant="outline" 
              onClick={goToCurrentMonth}
              className="h-7 px-2 text-xs bg-white/70 hover:bg-indigo-100 border-indigo-200 text-indigo-700"
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToNextMonth}
              className="h-7 w-7 bg-white/70 hover:bg-indigo-100 border-indigo-200"
            >
              <ChevronRight className="h-4 w-4 text-indigo-600" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-4">
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <h2 className="text-lg font-medium text-indigo-900">
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
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-1/2 min-w-[280px] overflow-x-auto">
              <div className="rounded-md shadow-sm">
                <Calendar
                  mode="single"
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  selected={undefined}
                  onSelect={handleDayClick}
                  className="rounded-md border-indigo-100 w-full min-w-full border border-opacity-40 shadow-inner bg-white/70"
                  components={{
                    DayContent: ({ date }) => (
                      <div className="relative w-full h-full flex items-center justify-center">
                        {date.getDate()}
                        {dayContent(date)}
                      </div>
                    ),
                  }}
                  modifiersClassNames={{
                    hasJob: "bg-indigo-50 hover:bg-indigo-100 font-medium text-indigo-800",
                    today: "bg-violet-100 font-bold text-violet-800 border border-violet-300"
                  }}
                  modifiers={{
                    hasJob: (date) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      return !!jobDates[dateStr]?.length;
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="md:w-1/2 flex flex-col">
              <h3 className="font-medium text-sm mb-2 text-indigo-800">Jobs This Month</h3>
              
              {currentMonthJobs.length === 0 ? (
                <div className="text-center p-4 bg-white/50 rounded-md border border-indigo-100/30">
                  <p className="text-sm text-indigo-400">No jobs scheduled this month</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] md:h-[340px] rounded-md border border-indigo-100/30 bg-white/50 shadow-inner">
                  <div className="space-y-2 p-3">
                    {currentMonthJobs.map(job => {
                      const isJobInPast = isDateInPast(job.date);
                      const statusDisplay = job.status === 'completed' || isJobInPast
                        ? 'Completed'
                        : job.status === 'cancelled'
                          ? 'Cancelled'
                          : 'Active';
                      
                      return (
                        <Card key={job.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-all border-indigo-50 bg-gradient-to-r from-white to-indigo-50/40" onClick={() => {
                          if (job.date) {
                            handleDayClick(parseISO(job.date));
                          }
                        }}>
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <p className="font-medium text-sm text-indigo-700">{job.title}</p>
                                {job.date && (
                                  <p className="text-xs text-indigo-500/70 mt-1">
                                    {format(parseISO(job.date), 'MMM d, yyyy')}
                                    {job.startTime && ` · ${job.startTime}`}
                                  </p>
                                )}
                              </div>
                              <Badge className={
                                job.status === 'completed' || isJobInPast
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : job.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800 border-red-200'
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                              }>
                                {statusDisplay}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showJobsDialog} onOpenChange={setShowJobsDialog}>
        <DialogContent className="sm:max-w-md bg-gradient-to-b from-indigo-50 to-white border-indigo-100">
          <DialogHeader>
            <DialogTitle className="flex items-center text-indigo-800">
              <CalendarIcon className="h-5 w-5 mr-2 text-indigo-600" />
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Job Details'}
            </DialogTitle>
            <DialogDescription className="text-indigo-600">
              {selectedDateJobs.length > 0 
                ? `${selectedDateJobs.length} job(s) scheduled for this day`
                : 'No jobs scheduled for this day'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto py-4">
            {selectedDateJobs.length > 0 ? (
              <div className="space-y-4">
                {selectedDateJobs.map((job) => (
                  <Card key={job.id} className="overflow-hidden border-indigo-100 bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-lg text-indigo-800">{job.title}</h3>
                          <Badge className={
                            job.status === 'completed' 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : job.status === 'cancelled' 
                                ? 'bg-red-100 text-red-800 border-red-200' 
                                : isDateInPast(job.date)
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                          }>
                            {job.status === 'completed' || isDateInPast(job.date) 
                              ? 'Completed' 
                              : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </Badge>
                        </div>
                        
                        {job.location && (
                          <div className="text-sm text-indigo-700">
                            <span className="font-medium">Location:</span> {job.location}
                          </div>
                        )}
                        
                        {job.startTime && (
                          <div className="text-sm text-indigo-700">
                            <span className="font-medium">Time:</span> {job.startTime} {job.endTime ? `- ${job.endTime}` : ''}
                          </div>
                        )}
                        
                        {job.description && (
                          <div className="text-sm mt-2">
                            <span className="font-medium text-indigo-700">Description:</span>
                            <p className="mt-1 text-indigo-600/80">{job.description}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-indigo-300 mb-4" />
                <p className="text-indigo-400">No jobs scheduled for this day</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper function to check if a date is in the past
const isDateInPast = (dateString?: string): boolean => {
  if (!dateString) return false;
  
  try {
    const jobDate = parseISO(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    return isBefore(jobDate, today) && !isSameDay(jobDate, today);
  } catch (e) {
    console.error('Error checking if date is in past:', e);
    return false;
  }
};

export default JobCalendar;
