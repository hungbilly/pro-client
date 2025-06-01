
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Info, BookOpen, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const OnboardingWelcome = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Welcome to Wedding Studio Manager</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your all-in-one platform for managing your wedding photography business. 
          Let's set up your workspace to get started.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-10">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">1</div>
          <p className="mt-2 text-sm font-medium">Create Company</p>
        </div>
        <div className="h-1 flex-1 mx-2 bg-muted">
          <div className="h-full w-0 bg-primary"></div>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">2</div>
          <p className="mt-2 text-sm font-medium text-muted-foreground">Set Up Packages</p>
        </div>
        <div className="h-1 flex-1 mx-2 bg-muted">
          <div className="h-full w-0 bg-primary"></div>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">3</div>
          <p className="mt-2 text-sm font-medium text-muted-foreground">Add Clients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-8">
        {/* Left Column - Main Action */}
        <Card className="shadow-lg border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-2xl">Step 1: Create Your Company</CardTitle>
            <CardDescription>Set up your business information</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Business Details</h3>
                  <p className="text-sm text-muted-foreground">Add your company name, logo, contact information, and business address.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Why is this important?</h3>
                  <p className="text-sm text-muted-foreground">Your company information will appear on invoices, contracts, and client communications.</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pt-2 pb-6">
            <Button size="lg" asChild className="w-full md:w-auto">
              <a href="/settings" className="flex items-center gap-2">
                Create Your Company Now
                <ChevronRight className="h-4 w-4" />
              </a>
            </Button>
          </CardFooter>
        </Card>

        {/* Right Column - What's Next */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
            <CardDescription>After creating your company, you'll set up:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-secondary/20 p-2 rounded-full">
                <span className="text-sm font-bold">2</span>
              </div>
              <div>
                <h3 className="font-medium">Service Packages</h3>
                <p className="text-sm text-muted-foreground">Define your service offerings and pricing tiers for clients.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-secondary/20 p-2 rounded-full">
                <span className="text-sm font-bold">3</span>
              </div>
              <div>
                <h3 className="font-medium">Client Management</h3>
                <p className="text-sm text-muted-foreground">Start adding clients and managing your wedding bookings.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-secondary/20 p-2 rounded-full">
                <span className="text-sm font-bold">4</span>
              </div>
              <div>
                <h3 className="font-medium">Invoices & Contracts</h3>
                <p className="text-sm text-muted-foreground">Create professional invoices and contracts for your clients.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Help & Resources */}
      <div className="w-full">
        <Separator className="mb-6" />
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Need help? Check out our <a href="#" className="text-primary hover:underline">quick start guide</a> or <a href="#" className="text-primary hover:underline">video tutorials</a>.</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <span>Please refresh the page after creating your company.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWelcome;
