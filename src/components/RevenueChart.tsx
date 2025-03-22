
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, parseISO, subMonths, addMonths, subDays, startOfYear, endOfYear, differenceInDays, getMonth, getYear, isValid } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart
} from 'recharts';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { type DateRange } from "react-day-picker";
import { Invoice, Job, PaymentSchedule } from '@/types';
import { getInvoicesByDate, getInvoice } from '@/lib/storage';
import { logDebug, logError, logDataTransformation } from '@/integrations/supabase/client';

interface RevenueChartProps {
  invoices: Invoice[];
  jobs: Job[];
}

type DateRangeType = 'custom' | 'this-month' | 'last-month' | 'this-year' | 'last-30-days' | 'last-60-days';

const RevenueChart: React.FC<RevenueChartProps> = ({ invoices, jobs }) => {
  const [currentDateRange, setCurrentDateRange] = useState<DateRangeType>('this-month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [chartData, setChartData] = useState<any[]>([]);
  
  const [showPaidRevenue, setShowPaidRevenue] = useState(true);
  const [showUnpaidRevenue, setShowUnpaidRevenue] = useState(true);
  const [showTotalRevenue, setShowTotalRevenue] = useState(true);
  const [showJobCount, setShowJobCount] = useState(true);
  
  useEffect(() => {
    logDebug('RevenueChart: Generating chart data with', { 
      invoiceCount: invoices.length, 
      jobCount: jobs.length,
      currentDateRange 
    });
    
    if (invoices.length > 0) {
      // Log more detailed information about invoices and their payment schedules
      logDebug('Sample invoices with payment schedules:', invoices.slice(0, 3).map(inv => ({
        id: inv.id,
        amount: inv.amount,
        status: inv.status,
        date: inv.date,
        dateFormatted: inv.date ? formatDateToYYYYMMDD(parseDate(inv.date)) : 'no date',
        paymentSchedules: inv?.paymentSchedules || [],
        paymentSchedulesCount: inv?.paymentSchedules?.length || 0,
        hasAnyPaidSchedules: inv?.paymentSchedules?.some(schedule => schedule.status === 'paid') || false
      })));
    }
    
    generateChartData();
  }, [invoices, jobs, currentDateRange, customDateRange]);
  
  const formatDateToYYYYMMDD = (date: Date): string => {
    try {
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      logDebug('Error formatting date', { date, error });
      return '';
    }
  };
  
  const parseDate = (dateString: string): Date => {
    try {
      const parsedDate = parseISO(dateString);
      return isValid(parsedDate) ? parsedDate : new Date();
    } catch (error) {
      logDebug('Error parsing date', { dateString, error });
      return new Date();
    }
  };
  
  const getDateRange = (): { startDate: Date, endDate: Date } => {
    const today = new Date();
    
    switch (currentDateRange) {
      case 'this-month':
        return {
          startDate: startOfMonth(today),
          endDate: endOfMonth(today)
        };
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        return {
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth)
        };
      case 'this-year':
        return {
          startDate: startOfYear(today),
          endDate: endOfYear(today)
        };
      case 'last-30-days':
        return {
          startDate: subDays(today, 30),
          endDate: today
        };
      case 'last-60-days':
        return {
          startDate: subDays(today, 60),
          endDate: today
        };
      case 'custom':
        return {
          startDate: customDateRange?.from || subDays(today, 30),
          endDate: customDateRange?.to || today
        };
      default:
        return {
          startDate: startOfMonth(today),
          endDate: endOfMonth(today)
        };
    }
  };
  
  const generateChartData = () => {
    const { startDate, endDate } = getDateRange();
    const daysDifference = differenceInDays(endDate, startDate);
    
    logDebug('RevenueChart: Generating data for date range:', { 
      startDate: formatDateToYYYYMMDD(startDate), 
      endDate: formatDateToYYYYMMDD(endDate),
      daysDifference
    });
    
    // If the date range is greater than 30 days, show monthly data
    if (daysDifference > 30) {
      generateMonthlyChartData(startDate, endDate);
    } else {
      generateDailyChartData(startDate, endDate);
    }
  };
  
  const generateDailyChartData = (startDate: Date, endDate: Date) => {
    const daysInRange = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      daysInRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    logDebug(`Date range contains ${daysInRange.length} days (daily view)`);
    
    const data = daysInRange.map(day => {
      const dayFormatted = formatDateToYYYYMMDD(day);
      
      const dayJobs = jobs.filter(job => {
        if (!job.date) return false;
        const jobDate = parseDate(job.date);
        return formatDateToYYYYMMDD(jobDate) === dayFormatted;
      });
      
      let paidAmount = 0;
      let unpaidAmount = 0;
      
      invoices.forEach(invoice => {
        // Check if invoice has paymentSchedules and use them
        const schedules = invoice.paymentSchedules && invoice.paymentSchedules.length > 0
          ? invoice.paymentSchedules
          : [{
              id: `default-${invoice.id}`,
              dueDate: invoice.date,
              percentage: 100,
              description: 'Default schedule',
              status: invoice.status === 'paid' ? 'paid' : 'unpaid'
            }];
        
        // Debug log for problematic invoices that might not have payment schedules
        if (!invoice.paymentSchedules || invoice.paymentSchedules.length === 0) {
          logDebug(`Invoice ${invoice.id} has no payment schedules, using default`, {
            invoiceStatus: invoice.status,
            amount: invoice.amount,
            date: invoice.date
          });
        }
      
        schedules.forEach(schedule => {
          // Determine which date to use based on the schedule status
          let relevantDate: string;
          let dateType: string;
          
          if (schedule.status === 'paid' && schedule.paymentDate) {
            // For paid schedules, use payment_date if available
            relevantDate = schedule.paymentDate;
            dateType = 'paymentDate';
          } else if (schedule.dueDate) {
            // For unpaid schedules or paid without payment_date, use due_date
            relevantDate = schedule.dueDate;
            dateType = 'dueDate';
          } else {
            // Fallback to invoice date if nothing else available
            relevantDate = invoice.date;
            dateType = 'invoiceDate';
          }
          
          if (!relevantDate) {
            logDebug(`Schedule has no valid date for invoice ${invoice.id}`, schedule);
            return;
          }
          
          const scheduleDate = parseDate(relevantDate);
          const scheduleDateFormatted = formatDateToYYYYMMDD(scheduleDate);
          
          if (scheduleDateFormatted === dayFormatted) {
            const scheduleAmount = (schedule.percentage / 100) * invoice.amount;
            
            logDebug(`Found payment schedule for day ${dayFormatted}:`, {
              invoiceId: invoice.id,
              scheduleId: schedule.id,
              totalAmount: invoice.amount,
              schedulePercentage: schedule.percentage,
              scheduleAmount,
              status: schedule.status,
              dateUsed: dateType,
              dateValue: relevantDate,
              formattedDate: scheduleDateFormatted
            });
            
            // Explicitly check for 'paid' status string
            if (schedule.status === 'paid') {
              paidAmount += scheduleAmount;
              logDebug(`Adding ${scheduleAmount} to paidAmount for invoice ${invoice.id}`, {
                scheduleId: schedule.id,
                newTotal: paidAmount
              });
            } else {
              unpaidAmount += scheduleAmount;
              logDebug(`Adding ${scheduleAmount} to unpaidAmount for invoice ${invoice.id}`, {
                scheduleId: schedule.id,
                newTotal: unpaidAmount
              });
            }
          }
        });
      });
      
      const totalAmount = paidAmount + unpaidAmount;
      
      if (paidAmount > 0 || unpaidAmount > 0) {
        logDebug(`Revenue data for ${dayFormatted}:`, { 
          paidAmount, 
          unpaidAmount, 
          totalAmount, 
          jobCount: dayJobs.length 
        });
      }
      
      return {
        date: dayFormatted,
        displayDate: format(day, 'd MMM'),
        paidAmount,
        unpaidAmount,
        totalAmount,
        jobCount: dayJobs.length,
      };
    });
    
    const totalPaid = data.reduce((sum, item) => sum + item.paidAmount, 0);
    const totalUnpaid = data.reduce((sum, item) => sum + item.unpaidAmount, 0);
    const totalRevenue = data.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalJobs = data.reduce((sum, item) => sum + item.jobCount, 0);
    
    logDebug('RevenueChart: Final daily chart data summary:', {
      dataPointsCount: data.length,
      totalPaid,
      totalUnpaid,
      totalRevenue,
      totalJobs
    });
    
    setChartData(data);
  };
  
  const generateMonthlyChartData = (startDate: Date, endDate: Date) => {
    // Create a map to store monthly aggregated data
    const monthlyData = new Map();
    
    // Loop through all invoices and aggregate by month
    invoices.forEach(invoice => {
      const schedules = invoice.paymentSchedules && invoice.paymentSchedules.length > 0
        ? invoice.paymentSchedules
        : [{
            id: `default-${invoice.id}`,
            dueDate: invoice.date,
            percentage: 100,
            description: 'Default schedule',
            status: invoice.status === 'paid' ? 'paid' : 'unpaid'
          }];
      
      schedules.forEach(schedule => {
        let relevantDate: string;
        
        if (schedule.status === 'paid' && schedule.paymentDate) {
          relevantDate = schedule.paymentDate;
        } else if (schedule.dueDate) {
          relevantDate = schedule.dueDate;
        } else {
          relevantDate = invoice.date;
        }
        
        if (!relevantDate) return;
        
        const scheduleDate = parseDate(relevantDate);
        
        // Skip if outside date range
        if (scheduleDate < startDate || scheduleDate > endDate) return;
        
        const monthYear = `${getYear(scheduleDate)}-${getMonth(scheduleDate)}`;
        const scheduleAmount = (schedule.percentage / 100) * invoice.amount;
        
        if (!monthlyData.has(monthYear)) {
          monthlyData.set(monthYear, {
            month: getMonth(scheduleDate),
            year: getYear(scheduleDate),
            date: scheduleDate,
            paidAmount: 0,
            unpaidAmount: 0,
            totalAmount: 0,
            jobCount: 0
          });
        }
        
        const monthData = monthlyData.get(monthYear);
        
        if (schedule.status === 'paid') {
          monthData.paidAmount += scheduleAmount;
        } else {
          monthData.unpaidAmount += scheduleAmount;
        }
        
        monthData.totalAmount = monthData.paidAmount + monthData.unpaidAmount;
      });
    });
    
    // Aggregate jobs by month
    jobs.forEach(job => {
      if (!job.date) return;
      
      const jobDate = parseDate(job.date);
      
      // Skip if outside date range
      if (jobDate < startDate || jobDate > endDate) return;
      
      const monthYear = `${getYear(jobDate)}-${getMonth(jobDate)}`;
      
      if (!monthlyData.has(monthYear)) {
        monthlyData.set(monthYear, {
          month: getMonth(jobDate),
          year: getYear(jobDate),
          date: jobDate,
          paidAmount: 0,
          unpaidAmount: 0,
          totalAmount: 0,
          jobCount: 0
        });
      }
      
      const monthData = monthlyData.get(monthYear);
      monthData.jobCount += 1;
    });
    
    // Convert map to array and sort by date
    const monthlyDataArray = Array.from(monthlyData.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(data => ({
        ...data,
        date: formatDateToYYYYMMDD(data.date),
        displayDate: format(data.date, 'MMM yyyy')
      }));
    
    logDebug('RevenueChart: Final monthly chart data summary:', {
      dataPointsCount: monthlyDataArray.length,
      months: monthlyDataArray.map(m => m.displayDate)
    });
    
    setChartData(monthlyDataArray);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const dateRangeLabel = () => {
    const { startDate, endDate } = getDateRange();
    if (currentDateRange === 'custom' && customDateRange) {
      return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    
    switch (currentDateRange) {
      case 'this-month':
        return format(startDate, 'MMMM yyyy');
      case 'last-month':
        return format(startDate, 'MMMM yyyy');
      case 'this-year':
        return format(startDate, 'yyyy');
      case 'last-30-days':
        return 'Last 30 Days';
      case 'last-60-days':
        return 'Last 60 Days';
      default:
        return 'Custom Date Range';
    }
  };
  
  const handleDateRangeChange = (range: DateRangeType) => {
    setCurrentDateRange(range);
  };

  // Determine if we're in monthly view (for label in UI)
  const isMonthlyView = () => {
    const { startDate, endDate } = getDateRange();
    return differenceInDays(endDate, startDate) > 30;
  };

  return (
    <Card className="w-full backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Revenue & Jobs Overview</CardTitle>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 gap-1 text-xs md:text-sm"
              >
                <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                <span className="max-w-[120px] md:max-w-[180px] truncate">
                  {dateRangeLabel()}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 max-w-[300px]" align="end">
              <div className="p-3 flex flex-col gap-2">
                <p className="font-medium text-sm">Date Range</p>
                <div className="grid gap-1">
                  <Button 
                    variant={currentDateRange === 'this-month' ? 'default' : 'outline'} 
                    className="justify-start text-xs h-8" 
                    onClick={() => handleDateRangeChange('this-month')}
                  >
                    This Month
                  </Button>
                  <Button 
                    variant={currentDateRange === 'last-month' ? 'default' : 'outline'} 
                    className="justify-start text-xs h-8" 
                    onClick={() => handleDateRangeChange('last-month')}
                  >
                    Last Month
                  </Button>
                  <Button 
                    variant={currentDateRange === 'this-year' ? 'default' : 'outline'} 
                    className="justify-start text-xs h-8" 
                    onClick={() => handleDateRangeChange('this-year')}
                  >
                    This Year
                  </Button>
                  <Button 
                    variant={currentDateRange === 'last-30-days' ? 'default' : 'outline'} 
                    className="justify-start text-xs h-8" 
                    onClick={() => handleDateRangeChange('last-30-days')}
                  >
                    Last 30 Days
                  </Button>
                  <Button 
                    variant={currentDateRange === 'last-60-days' ? 'default' : 'outline'} 
                    className="justify-start text-xs h-8" 
                    onClick={() => handleDateRangeChange('last-60-days')}
                  >
                    Last 60 Days
                  </Button>
                  <Button 
                    variant={currentDateRange === 'custom' ? 'default' : 'outline'} 
                    className="justify-start text-xs h-8" 
                    onClick={() => handleDateRangeChange('custom')}
                  >
                    Custom Range
                  </Button>
                </div>
                
                {currentDateRange === 'custom' && (
                  <div className="mt-2">
                    <DatePicker
                      mode="range"
                      selected={customDateRange}
                      onSelect={(range) => setCustomDateRange(range)}
                      highlightToday={true}
                      classNames={{
                        day_range_start: "bg-primary text-primary-foreground rounded-l-md",
                        day_range_end: "bg-primary text-primary-foreground rounded-r-md",
                        day_range_middle: "bg-primary/20 text-primary rounded-none",
                      }}
                    />
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4">
          <label className="flex items-center space-x-2">
            <Checkbox 
              checked={showPaidRevenue} 
              onCheckedChange={(checked) => setShowPaidRevenue(checked as boolean)} 
              className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
            />
            <span className="text-sm">Paid Revenue</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <Checkbox 
              checked={showUnpaidRevenue} 
              onCheckedChange={(checked) => setShowUnpaidRevenue(checked as boolean)}
              className="data-[state=checked]:bg-blue-300 data-[state=checked]:border-blue-300" 
            />
            <span className="text-sm">Unpaid Revenue</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <Checkbox 
              checked={showTotalRevenue} 
              onCheckedChange={(checked) => setShowTotalRevenue(checked as boolean)}
              className="data-[state=checked]:bg-purple-700 data-[state=checked]:border-purple-700"
            />
            <span className="text-sm">Total Revenue</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <Checkbox 
              checked={showJobCount} 
              onCheckedChange={(checked) => setShowJobCount(checked as boolean)}
              className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            <span className="text-sm">Jobs Count</span>
          </label>

          {isMonthlyView() && (
            <span className="ml-auto text-xs text-muted-foreground italic">
              Showing monthly aggregated data
            </span>
          )}
        </div>
        
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'paidAmount') {
                    return [formatCurrency(value), 'Paid Revenue'];
                  } else if (name === 'unpaidAmount') {
                    return [formatCurrency(value), 'Unpaid Revenue'];
                  } else if (name === 'totalAmount') {
                    return [formatCurrency(value), 'Total Revenue'];
                  } else if (name === 'jobCount') {
                    return [value, 'Jobs Count'];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              {showPaidRevenue && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="paidAmount"
                  name="Paid Revenue"
                  fill="#9b87f5"
                  fillOpacity={0.3}
                  stroke="#9b87f5"
                  activeDot={{ r: 8 }}
                />
              )}
              {showUnpaidRevenue && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="unpaidAmount"
                  name="Unpaid Revenue"
                  fill="#E5DEFF"
                  fillOpacity={0.3}
                  stroke="#E5DEFF"
                  activeDot={{ r: 6 }}
                />
              )}
              {showTotalRevenue && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalAmount"
                  name="Total Revenue"
                  stroke="#6E59A5"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                />
              )}
              {showJobCount && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="jobCount"
                  name="Jobs Count"
                  stroke="#F97316"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
