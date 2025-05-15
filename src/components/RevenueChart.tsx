
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, parseISO, subMonths, addMonths, subDays, startOfYear, endOfYear, differenceInDays, getMonth, getYear, isValid } from 'date-fns';
import { 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart
} from 'recharts';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { type DateRange } from "react-day-picker";
import { Invoice, Job, Expense } from '@/types';
import { logDebug } from '@/integrations/supabase/client';

interface RevenueChartProps {
  invoices: Invoice[];
  jobs: Job[];
  expenses: Expense[];
}

type DateRangeType = 'custom' | 'this-month' | 'last-month' | 'this-year' | 'last-30-days' | 'last-60-days';

const RevenueChart: React.FC<RevenueChartProps> = ({ invoices, jobs, expenses }) => {
  const [currentDateRange, setCurrentDateRange] = useState<DateRangeType>('this-month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [chartData, setChartData] = useState<any[]>([]);
  
  const [showRevenue, setShowRevenue] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showProfit, setShowProfit] = useState(true);
  
  useEffect(() => {
    logDebug('RevenueChart: Generating chart data with', { 
      invoiceCount: invoices.length, 
      jobCount: jobs.length,
      expensesCount: expenses.length,
      currentDateRange 
    });
    
    generateChartData();
  }, [invoices, jobs, expenses, currentDateRange, customDateRange]);
  
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
      
      // Calculate revenue for the day
      let totalRevenue = 0;
      
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
        
        schedules.forEach(schedule => {
          // Only count paid payments as revenue
          if (schedule.status === 'paid') {
            let relevantDate = schedule.paymentDate || schedule.dueDate || invoice.date;
            
            if (!relevantDate) return;
            
            const scheduleDate = parseDate(relevantDate);
            const scheduleDateFormatted = formatDateToYYYYMMDD(scheduleDate);
            
            if (scheduleDateFormatted === dayFormatted) {
              const scheduleAmount = (schedule.percentage / 100) * invoice.amount;
              totalRevenue += scheduleAmount;
            }
          }
        });
      });
      
      // Calculate expenses for the day
      let totalExpenses = 0;
      
      expenses.forEach(expense => {
        if (!expense.date) return;
        
        const expenseDate = parseDate(expense.date);
        const expenseDateFormatted = formatDateToYYYYMMDD(expenseDate);
        
        if (expenseDateFormatted === dayFormatted) {
          totalExpenses += expense.amount;
        }
      });
      
      // Calculate profit/loss
      const profitLoss = totalRevenue - totalExpenses;
      
      return {
        date: dayFormatted,
        displayDate: format(day, 'd MMM'),
        revenue: totalRevenue,
        expenses: totalExpenses,
        profitLoss: profitLoss
      };
    });
    
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const totalExpenses = data.reduce((sum, item) => sum + item.expenses, 0);
    const totalProfitLoss = data.reduce((sum, item) => sum + item.profitLoss, 0);
    
    logDebug('RevenueChart: Final daily chart data summary:', {
      dataPointsCount: data.length,
      totalRevenue,
      totalExpenses,
      totalProfitLoss
    });
    
    setChartData(data);
  };
  
  const generateMonthlyChartData = (startDate: Date, endDate: Date) => {
    // Create a map to store monthly aggregated data
    const monthlyData = new Map();
    
    // Process invoices for revenue
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
        // Only count paid payments as revenue
        if (schedule.status === 'paid') {
          let relevantDate = schedule.paymentDate || schedule.dueDate || invoice.date;
          
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
              revenue: 0,
              expenses: 0,
              profitLoss: 0
            });
          }
          
          const monthData = monthlyData.get(monthYear);
          monthData.revenue += scheduleAmount;
          monthData.profitLoss = monthData.revenue - monthData.expenses;
        }
      });
    });
    
    // Process expenses
    expenses.forEach(expense => {
      if (!expense.date) return;
      
      const expenseDate = parseDate(expense.date);
      
      // Skip if outside date range
      if (expenseDate < startDate || expenseDate > endDate) return;
      
      const monthYear = `${getYear(expenseDate)}-${getMonth(expenseDate)}`;
      
      if (!monthlyData.has(monthYear)) {
        monthlyData.set(monthYear, {
          month: getMonth(expenseDate),
          year: getYear(expenseDate),
          date: expenseDate,
          revenue: 0,
          expenses: 0,
          profitLoss: 0
        });
      }
      
      const monthData = monthlyData.get(monthYear);
      monthData.expenses += expense.amount;
      monthData.profitLoss = monthData.revenue - monthData.expenses;
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

  // Calculate total profit/loss
  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const totalExpenses = chartData.reduce((sum, item) => sum + item.expenses, 0);
  const totalProfitLoss = totalRevenue - totalExpenses;
  const isProfitable = totalProfitLoss >= 0;

  return (
    <Card className="w-full backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Expense vs. Revenue Balance</CardTitle>
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
        <div className="flex flex-col mb-4">
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex items-center space-x-2">
              <Checkbox 
                checked={showRevenue} 
                onCheckedChange={(checked) => setShowRevenue(checked as boolean)} 
                className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
              />
              <span className="text-sm">Revenue</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <Checkbox 
                checked={showExpenses} 
                onCheckedChange={(checked) => setShowExpenses(checked as boolean)}
                className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" 
              />
              <span className="text-sm">Expenses</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <Checkbox 
                checked={showProfit} 
                onCheckedChange={(checked) => setShowProfit(checked as boolean)}
                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <span className="text-sm">Profit/Loss</span>
            </label>
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="text-sm font-medium">
              Overall Balance: 
              <span className={`ml-2 font-bold ${isProfitable ? 'text-green-600' : 'text-red-500'}`}>
                {formatCurrency(totalProfitLoss)}
              </span>
            </div>
            <div className="flex items-center text-sm">
              {isProfitable ? (
                <div className="flex items-center text-green-600">
                  <TrendingUp size={16} className="mr-1" /> Profit
                </div>
              ) : (
                <div className="flex items-center text-red-500">
                  <TrendingDown size={16} className="mr-1" /> Loss
                </div>
              )}
            </div>
          </div>

          {isMonthlyView() && (
            <span className="text-xs text-muted-foreground italic mt-2">
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
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'revenue') {
                    return [formatCurrency(value), 'Revenue'];
                  } else if (name === 'expenses') {
                    return [formatCurrency(value), 'Expenses'];
                  } else if (name === 'profitLoss') {
                    const prefix = value >= 0 ? 'Profit: ' : 'Loss: ';
                    return [formatCurrency(value), prefix];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              {showRevenue && (
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="Revenue"
                  fill="#9b87f5"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              )}
              {showExpenses && (
                <Bar
                  yAxisId="left"
                  dataKey="expenses"
                  name="Expenses"
                  fill="#f87171"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              )}
              {showProfit && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="profitLoss"
                  name="Profit/Loss"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
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
