
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageTransition from '@/components/ui-custom/PageTransition';
import CompanySettings from '@/components/CompanySettings';

const Settings = () => {
  console.log("Settings page rendering");
  
  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue="company" className="space-y-4">
          <TabsList>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="company" className="space-y-4">
            <CompanySettings />
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
              <p className="text-muted-foreground">Billing settings will be available in a future update.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default Settings;
