
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isWithinInterval, subMonths, addMonths } from 'date-fns';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Invoice, Job } from '@/types';

interface RevenueChartProps {
  invoices: Invoice[];
  jobs: Job[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ invoices, jobs }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [chartData, setChartData] = useState<any[]>([]);
  
  useEffect(() => {
    generateChartData();
  }, [invoices, jobs, currentMonth]);
  
  const generateChartData = () => {
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    
    const data = daysInMonth.map(day => {
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
  
  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <Card className="w-full backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Revenue & Jobs Overview</CardTitle>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
                  if (name === 'paidAmount' || name === 'unpaidAmount' || name === 'totalAmount') {
                    return [formatCurrency(value), name === 'paidAmount' ? 'Paid' : name === 'unpaidAmount' ? 'Unpaid' : 'Total'];
                  }
                  return [value, 'Jobs'];
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
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
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
