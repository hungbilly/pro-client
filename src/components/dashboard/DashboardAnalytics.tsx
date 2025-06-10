
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
        <div className="glass-card-enhanced shadow-glass-lg border-white/30 backdrop-blur-xl bg-white/20 rounded-2xl p-6">
          <RevenueChart invoices={invoices} jobs={jobs} expenses={expenses} />
        </div>
      </div>
      
      {/* Job Calendar */}
      <div className="lg:col-span-1 overflow-x-auto">
        <div className="glass-card-enhanced shadow-glass-lg border-white/30 backdrop-blur-xl bg-white/20 rounded-2xl p-6">
          <JobCalendar jobs={jobs} />
        </div>
      </div>
    </div>
  );
};

export default DashboardAnalytics;
