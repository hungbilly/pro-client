
import React, { useMemo, useState, useEffect } from 'react';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import JobList from '@/components/JobList';
import InvoiceList from '@/components/InvoiceList';
import JobCalendar from '@/components/JobCalendar';
import RevenueChart from '@/components/RevenueChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, CheckCircle2, AlertTriangle, CalendarDays, ListChecks, BarChart3 } from 'lucide-react';
import { useCompanyContext } from '@/context/CompanyContext';
import OnboardingGuide from './OnboardingGuide';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { companies, selectedCompany, loading } = useCompanyContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Determine if user has any companies yet
  const hasCompanies = useMemo(() => companies.length > 0, [companies]);

  // If still loading, show skeletons
  if (loading) {
    return (
      <Container className="py-8">
        <div className="space-y-8">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-[250px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-[180px]" />
            <Skeleton className="h-[180px]" />
            <Skeleton className="h-[180px]" />
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </Container>
    );
  }
  
  // If no companies, show the onboarding guide
  if (!hasCompanies) {
    return <OnboardingGuide />;
  }

  // Regular dashboard for users with companies
  return (
    <Container className="py-6">
      <div className="mb-6 flex justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back to {selectedCompany?.name || 'your dashboard'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={() => navigate('/client/new')}>
            <Plus className="mr-2 h-4 w-4" /> Add Client
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-1">
            <ListChecks className="h-4 w-4" />
            <span>Jobs</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            <span>Calendar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Jobs
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  No active jobs currently
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Invoices
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  No pending invoices
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Revenue
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">
                  No revenue recorded yet
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <RevenueChart />
            </CardContent>
          </Card>
          
          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceList limit={5} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <JobList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <JobCalendar />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
};

export default Dashboard;
