
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, isSameMonth, isAfter, isBefore, parseISO, addMonths, subMonths, isSameDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Job } from '@/types';

interface JobCalendarProps {
  jobs: Job[];
}

const JobCalendar: React.FC<JobCalendarProps> = ({ jobs }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [jobDates, setJobDates] = useState<Record<string, Job[]>>({});
  
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
    if (!job.date) return false;
    try {
      const jobDate = parseISO(job.date);
      return (
        isSameMonth(jobDate, currentMonth) && 
        isAfter(jobDate, new Date())
      );
    } catch (e) {
      return false;
    }
  });
  
  const completedJobs = jobs.filter(job => {
    if (!job.date || job.status !== 'completed') return false;
    try {
      const jobDate = parseISO(job.date);
      return isSameMonth(jobDate, currentMonth);
    } catch (e) {
      return false;
    }
  });
  
  // Custom day render function to show job indicators
  const dayClassName = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const hasJobs = jobDates[dateStr] && jobDates[dateStr].length > 0;
    
    return hasJobs ? 'bg-primary/10 rounded-md' : '';
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
          className="rounded-md border"
          components={{
            DayContent: ({ date }) => (
              <div className="relative w-full h-full flex items-center justify-center">
                {date.getDate()}
                {dayContent(date)}
              </div>
            ),
          }}
          modifiers={{
            hasJob: (date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              return !!jobDates[dateStr]?.length;
            }
          }}
          modifiersClassNames={{
            hasJob: "bg-primary/10"
          }}
          classNames={{
            day: (date) => dayClassName(date),
          }}
        />
      </CardContent>
    </Card>
  );
};

export default JobCalendar;
