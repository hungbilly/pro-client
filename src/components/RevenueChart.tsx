import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isWithinInterval, subMonths, addMonths, subDays, startOfYear, endOfYear } from 'date-fns';
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
import { Invoice, Job } from '@/types';

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
    generateChartData();
  }, [invoices, jobs, currentDateRange, customDateRange]);
  
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
    const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    const data = daysInRange.map(day => {
      const dayFormatted = format(day, 'yyyy-MM-dd');
      
      const dayInvoices = invoices.filter(invoice => {
        const invoiceDate = parseISO(invoice.date);
        return format(invoiceDate, 'yyyy-MM-dd') === dayFormatted;
      });
      
      const dayJobs = jobs.filter(job => {
        if (!job.date) return false;
        return job.date === dayFormatted;
      });
      
      const paidAmount = dayInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0);
        
      const unpaidAmount = dayInvoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0);
        
      const totalAmount = paidAmount + unpaidAmount;
      
      return {
        date: dayFormatted,
        displayDate: format(day, 'd MMM'),
        paidAmount: paidAmount,
        unpaidAmount: unpaidAmount,
        totalAmount: totalAmount,
        jobCount: dayJobs.length,
      };
    });
    
    setChartData(data);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleDateRangeChange = (range: DateRangeType) => {
    setCurrentDateRange(range);
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
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
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
                  name="paidAmount"
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
                  name="unpaidAmount"
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
                  name="totalAmount"
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
                  name="jobCount"
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
