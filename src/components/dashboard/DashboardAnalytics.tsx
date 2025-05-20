
import React from 'react';
import { Invoice, Job, Expense } from '@/types';
import RevenueChart from '../RevenueChart';
import JobCalendar from '../JobCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardAnalyticsProps {
  invoices: Invoice[];
  jobs: Job[];
  expenses: Expense[];
}

const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({ invoices, jobs, expenses }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Monthly Bar Chart */}
      <Card className="lg:col-span-1 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-purple-100 dark:border-purple-900/30 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="border-b border-purple-100 dark:border-purple-900/30 pb-2">
          <CardTitle className="text-lg font-medium text-purple-900 dark:text-purple-200">Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <RevenueChart invoices={invoices} jobs={jobs} expenses={expenses} />
        </CardContent>
      </Card>
      
      {/* Job Calendar */}
      <Card className="lg:col-span-1 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-purple-100 dark:border-purple-900/30 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="border-b border-purple-100 dark:border-purple-900/30 pb-2">
          <CardTitle className="text-lg font-medium text-purple-900 dark:text-purple-200">Job Schedule</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <JobCalendar jobs={jobs} />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardAnalytics;
