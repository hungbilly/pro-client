
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, parseISO, subMonths, addMonths, getMonth, getYear, isValid } from 'date-fns';
import { 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, BarChart as BarChartIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { type DateRange } from "react-day-picker";
import { Invoice, Job, Expense } from '@/types';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import { logDebug } from '@/integrations/supabase/client';

interface RevenueChartProps {
  invoices: Invoice[];
  jobs: Job[];
  expenses: Expense[];
}

type DateRangeType = 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'last-3-months' | 'last-6-months';

const RevenueChart: React.FC<RevenueChartProps> = ({ invoices, jobs, expenses }) => {
  const [currentDateRange, setCurrentDateRange] = useState<DateRangeType>('this-month');
  const [chartData, setChartData] = useState<any[]>([]);
  
  const [showRevenue, setShowRevenue] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showProfit, setShowProfit] = useState(true);
  
  useEffect(() => {
    generateChartData();
  }, [invoices, expenses, currentDateRange]);
  
  const formatDateToYYYYMMDD = (date: Date): string => {
    try {
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      return '';
    }
  };
  
  const parseDate = (dateString: string): Date => {
    try {
      const parsedDate = parseISO(dateString);
      return isValid(parsedDate) ? parsedDate : new Date();
    } catch (error) {
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
          startDate: new Date(today.getFullYear(), 0, 1),
          endDate: new Date(today.getFullYear(), 11, 31)
        };
      case 'last-year':
        return {
          startDate: new Date(today.getFullYear() - 1, 0, 1),
          endDate: new Date(today.getFullYear() - 1, 11, 31)
        };
      case 'last-3-months':
        return {
          startDate: startOfMonth(subMonths(today, 2)),
          endDate: endOfMonth(today)
        };
      case 'last-6-months':
        return {
          startDate: startOfMonth(subMonths(today, 5)),
          endDate: endOfMonth(today)
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
    generateMonthlyChartData(startDate, endDate);
  };
  
  const generateMonthlyChartData = (startDate: Date, endDate: Date) => {
    // Create a map to store monthly aggregated data
    const monthlyData = new Map();
    
    // Determine all months in the range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const monthYear = `${getYear(currentDate)}-${getMonth(currentDate)}`;
      
      monthlyData.set(monthYear, {
        month: getMonth(currentDate),
        year: getYear(currentDate),
        date: new Date(currentDate),
        revenue: 0,
        expenses: 0,
        profit: 0
      });
      
      currentDate = addMonths(currentDate, 1);
    }
    
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
          
          if (monthlyData.has(monthYear)) {
            const monthData = monthlyData.get(monthYear);
            const scheduleAmount = (schedule.percentage / 100) * invoice.amount;
            monthData.revenue += scheduleAmount;
            monthData.profit = monthData.revenue - monthData.expenses;
          }
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
      
      if (monthlyData.has(monthYear)) {
        const monthData = monthlyData.get(monthYear);
        monthData.expenses += expense.amount;
        monthData.profit = monthData.revenue - monthData.expenses;
      }
    });
    
    // Convert map to array and sort by date
    const monthlyDataArray = Array.from(monthlyData.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(data => ({
        ...data,
        displayDate: format(data.date, 'MMM yyyy')
      }));
    
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
    
    switch (currentDateRange) {
      case 'this-month':
        return format(startDate, 'MMMM yyyy');
      case 'last-month':
        return format(startDate, 'MMMM yyyy');
      case 'this-year':
        return format(startDate, 'yyyy');
      case 'last-year':
        return `${format(startDate, 'yyyy')}`;
      case 'last-3-months':
        return `Last 3 Months (${format(startDate, 'MMM')} - ${format(endDate, 'MMM')})`;
      case 'last-6-months':
        return `Last 6 Months (${format(startDate, 'MMM')} - ${format(endDate, 'MMM')})`;
      default:
        return 'Custom Date Range';
    }
  };
  
  const handleDateRangeChange = (range: DateRangeType) => {
    setCurrentDateRange(range);
  };

  // Calculate total revenue, expenses, and profit
  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const totalExpenses = chartData.reduce((sum, item) => sum + item.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const isProfitable = totalProfit >= 0;

  // Chart configuration
  const chartConfig = {
    revenue: {
      label: 'Revenue',
      theme: {
        light: '#9b87f5',
        dark: '#7E69AB'
      }
    },
    expenses: {
      label: 'Expenses',
      theme: {
        light: '#f87171',
        dark: '#ef4444'
      }
    },
    profit: {
      label: 'Profit',
      theme: {
        light: '#10b981',
        dark: '#059669'
      }
    }
  };

  return (
    <Card className="w-full backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Monthly Revenue vs. Expenses</CardTitle>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 gap-1 text-xs md:text-sm"
              >
                <BarChartIcon className="h-3 w-3 md:h-4 md:w-4" />
                <span className="max-w-[120px] md:max-w-[180px] truncate">
                  {dateRangeLabel()}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 max-w-[300px]" align="end">
              <div className="p-3 flex flex-col gap-2">
                <p className="font-medium text-sm">Time Range</p>
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
                    variant={currentDateRange === 'last-3-months' ? 'default' : 'outline'} 
                    className="justify-start text-xs h-8" 
                    onClick={() => handleDateRangeChange('last-3-months')}
                  >
                    Last 3 Months
                  </Button>
                  <Button 
                    variant={currentDateRange === 'last-6-months' ? 'default' : 'outline'} 
                    className="justify-start text-xs h-8" 
                    onClick={() => handleDateRangeChange('last-6-months')}
                  >
                    Last 6 Months
                  </Button>
                  <Button 
                    variant={currentDateRange === 'this-year' ? 'default' : 'outline'} 
                    className="justify-start text-xs h-8" 
                    onClick={() => handleDateRangeChange('this-year')}
                  >
                    This Year
                  </Button>
                  <Button 
                    variant={currentDateRange === 'last-year' ? 'default' : 'outline'} 
                    className="justify-start text-xs h-8" 
                    onClick={() => handleDateRangeChange('last-year')}
                  >
                    Last Year
                  </Button>
                </div>
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
                {formatCurrency(totalProfit)}
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
        </div>
        
        <div className="h-[300px]">
          <ChartContainer 
            className="h-full w-full" 
            config={chartConfig}
          >
            <BarChart
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
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value: number, name: string) => {
                      return [formatCurrency(value), name];
                    }}
                  />
                }
              />
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
              <ChartLegend 
                content={<ChartLegendContent />} 
                verticalAlign="top"
              />
              {showRevenue && (
                <Bar
                  dataKey="revenue"
                  name="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              )}
              {showExpenses && (
                <Bar
                  dataKey="expenses"
                  name="expenses"
                  fill="var(--color-expenses)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              )}
              {showProfit && (
                <Bar
                  dataKey="profit"
                  name="profit"
                  fill="var(--color-profit)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              )}
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
