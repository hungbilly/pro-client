
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Building, Users, Briefcase, FileText, ArrowRight, Plus, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/context/SubscriptionContext';

const OnboardingGuide = () => {
  const navigate = useNavigate();
  const { isInTrialPeriod, trialDaysLeft } = useSubscription();

  return (
    <div className="container max-w-5xl py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to ProClient!</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Let's get started by setting up your workspace and understanding how the app works.
          Follow these steps to get the most out of ProClient.
        </p>
        
        {isInTrialPeriod && (
          <Badge className="mt-4 bg-primary px-3 py-1">
            {trialDaysLeft} days remaining in your trial
          </Badge>
        )}
      </div>

      <div className="grid gap-6">
        {/* Getting Started Steps */}
        <Card>
          <CardHeader className="bg-muted/50">
            <CardTitle className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-sm font-medium">1</span>
              Getting Started
            </CardTitle>
            <CardDescription>Follow these steps to set up your business</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-2">
            <div className="space-y-5">
              <div className="flex gap-4 items-start">
                <div className="bg-blue-100 p-3 rounded-md">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Create Your Company</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Set up your company profile with your business details, logo, and payment settings.
                  </p>
                  <Button onClick={() => navigate('/settings')} className="flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    Create Company
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-4 items-start opacity-70">
                <div className="bg-green-100 p-3 rounded-md">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Add Your Clients</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Create profiles for your clients with their contact information and custom notes.
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="mr-1">Complete step 1 first</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start opacity-70">
                <div className="bg-amber-100 p-3 rounded-md">
                  <Briefcase className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Create Jobs</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Set up jobs for your clients with descriptions, dates, and pricing.
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="mr-1">Complete steps 1-2 first</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start opacity-70">
                <div className="bg-purple-100 p-3 rounded-md">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Generate Invoices</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Create professional invoices from jobs and track payments.
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="mr-1">Complete steps 1-3 first</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t p-4">
            <div className="w-full">
              <div className="flex justify-between text-sm mb-1">
                <span>Setup progress</span>
                <span>0/4 completed</span>
              </div>
              <Progress value={0} className="h-2" />
            </div>
          </CardFooter>
        </Card>

        {/* Key Features */}
        <Card>
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
            <CardDescription>Discover what you can do with ProClient</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col p-4 border rounded-lg">
                <div className="bg-blue-50 self-start p-2 rounded-md mb-3">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-medium mb-1">Client Management</h3>
                <p className="text-sm text-muted-foreground">Store client information, track client history, and organize your client base.</p>
              </div>

              <div className="flex flex-col p-4 border rounded-lg">
                <div className="bg-green-50 self-start p-2 rounded-md mb-3">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-medium mb-1">Job Scheduling</h3>
                <p className="text-sm text-muted-foreground">Schedule jobs, track their status, and manage your workflow efficiently.</p>
              </div>

              <div className="flex flex-col p-4 border rounded-lg">
                <div className="bg-amber-50 self-start p-2 rounded-md mb-3">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="font-medium mb-1">Professional Invoicing</h3>
                <p className="text-sm text-muted-foreground">Create customizable invoices and track payments in one place.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Tips</CardTitle>
            <CardDescription>Get the most out of ProClient</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Setup your <strong>company profile</strong> first with your logo and details to make your invoices look professional.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Use <strong>client tags</strong> to organize your clients by type, location, or any other category.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Create <strong>job templates</strong> for recurring work to save time when setting up new jobs.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Set up <strong>email notifications</strong> in Settings to automatically remind clients about upcoming payments.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Explore the <strong>Dashboard</strong> for insights about your revenue, upcoming jobs, and client statistics.</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="border-t">
            <Button variant="outline" className="w-full" onClick={() => navigate('/settings')}>
              Go to Settings to Complete Setup
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingGuide;
