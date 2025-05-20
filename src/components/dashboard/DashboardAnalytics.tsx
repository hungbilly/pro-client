
import React from 'react';
import { Invoice, Job, Expense } from '@/types';
import RevenueChart from '../RevenueChart';
import JobCalendar from '../JobCalendar';

interface DashboardAnalyticsProps {
  invoices: Invoice[];
  jobs: Job[];
  expenses: Expense[];
}

const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({ invoices, jobs, expenses }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Monthly Bar Chart */}
      <div className="lg:col-span-1">
        <RevenueChart invoices={invoices} jobs={jobs} expenses={expenses} />
      </div>
      
      {/* Job Calendar */}
      <div className="lg:col-span-1">
        <JobCalendar jobs={jobs} />
      </div>
    </div>
  );
};

export default DashboardAnalytics;
