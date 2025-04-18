import React, { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageTransition from '@/components/ui-custom/PageTransition';
import CompanySettings from '@/components/CompanySettings';
import InvoiceTemplateSettings from '@/components/InvoiceTemplateSettings';
import PackageSettings from '@/components/PackageSettings';
import ContractTemplateSettings from '@/components/ContractTemplateSettings';
import CompanyProvider from '@/context/CompanyContext';
import SubscriptionStatus from '@/components/SubscriptionStatus';
import SubscriptionManagement from '@/components/SubscriptionManagement';
import GoogleCalendarIntegration from '@/components/GoogleCalendarIntegration';
import { Button } from '@/components/ui/button';
import { Link, useSearchParams } from 'react-router-dom';
import { Bug, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import DiscountTemplateSettings from '@/components/DiscountTemplateSettings';

const Settings = () => {
  console.log("Settings page rendering");
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Handle calendar integration results
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const source = searchParams.get('source');
    
    if (source === 'calendar') {
      if (success === 'true') {
        console.log("Calendar integration successful");
        toast.success('Successfully connected to Google Calendar');
      } else if (error) {
        console.error("Calendar integration error:", error);
        toast.error(`Failed to connect: ${error}`);
      }
    }
    
    // Clear the URL parameters after processing
    if ((success || error) && window.history.replaceState) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);
  
  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <div className="flex gap-2">
            <Link to="/calendar-test">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Test Calendar
              </Button>
            </Link>
            <Link to="/admin/google-oauth-diagnostic">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Google OAuth Diagnostic
              </Button>
            </Link>
          </div>
        </div>
        
        <CompanyProvider>
          <Tabs defaultValue="company" className="space-y-4">
            <TabsList>
              <TabsTrigger value="company">Company</TabsTrigger>
              <TabsTrigger value="packages">Products & Packages</TabsTrigger>
              <TabsTrigger value="templates">Invoice Templates</TabsTrigger>
              <TabsTrigger value="contracts">Contract Templates</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="company" className="space-y-4">
              <CompanySettings />
            </TabsContent>
            
            <TabsContent value="packages" className="space-y-4">
              <PackageSettings />
            </TabsContent>
            
            <TabsContent value="templates" className="space-y-8">
              <InvoiceTemplateSettings />
              <Separator />
              <ContractTemplateSettings />
              <Separator />
              <DiscountTemplateSettings />
            </TabsContent>
            
            <TabsContent value="contracts" className="space-y-4">
              <div className="rounded-lg border p-6">
                <ContractTemplateSettings />
              </div>
            </TabsContent>
            
            <TabsContent value="integrations" className="space-y-4">
              <div className="rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">External Integrations</h2>
                <div className="space-y-6">
                  <GoogleCalendarIntegration />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="account" className="space-y-4">
              <div className="rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
                <p className="text-muted-foreground">Account settings will be available in a future update.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-4">
              <div className="rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
                <p className="text-muted-foreground">Notification settings will be available in a future update.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="billing" className="space-y-4">
              <div className="rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">Billing Information</h2>
                <div className="mb-6">
                  <SubscriptionStatus />
                </div>
                <div className="mt-6">
                  <SubscriptionManagement />
                </div>
                <h3 className="text-lg font-medium mt-8 mb-3">Payment History</h3>
                <p className="text-muted-foreground">Payment history will be available in a future update.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CompanyProvider>
      </div>
    </PageTransition>
  );
};

export default Settings;
