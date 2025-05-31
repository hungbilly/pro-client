
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, FileText, Settings as SettingsIcon, Package, Users, Calendar } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import CompanySettings from '@/components/CompanySettings';
import InvoiceTemplateSettings from '@/components/InvoiceTemplateSettings';
import ContractTemplateSettings from '@/components/ContractTemplateSettings';
import DiscountTemplateSettings from '@/components/DiscountTemplateSettings';
import PackageSettings from '@/components/PackageSettings';
import TeammateManagement from '@/components/teammates/TeammateManagement';
import GoogleCalendarIntegration from '@/components/GoogleCalendarIntegration';

const Settings = () => {
  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-6 w-6" />
              Settings
            </CardTitle>
            <CardDescription>
              Manage your account preferences and business settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="company" className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="company" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="teammates" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team
                </TabsTrigger>
                <TabsTrigger value="packages" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Packages
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Invoice Templates
                </TabsTrigger>
                <TabsTrigger value="contracts" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Contract Templates
                </TabsTrigger>
                <TabsTrigger value="discounts" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Discount Templates
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="company" className="mt-6">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-900 mb-1">Company Information</h3>
                    <p className="text-sm text-blue-700">
                      Set up your business details including name, logo, address, and payment methods. This information will appear on your invoices and be visible to clients.
                    </p>
                  </div>
                  <CompanySettings />
                </div>
              </TabsContent>
              
              <TabsContent value="calendar" className="mt-6">
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-sm font-medium text-green-900 mb-1">Calendar Integration</h3>
                    <p className="text-sm text-green-700">
                      Connect your Google Calendar to sync events and automatically add job dates to your calendar. This helps you stay organized and avoid double-booking.
                    </p>
                  </div>
                  <GoogleCalendarIntegration />
                </div>
              </TabsContent>
              
              <TabsContent value="teammates" className="mt-6">
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h3 className="text-sm font-medium text-purple-900 mb-1">Team Management</h3>
                    <p className="text-sm text-purple-700">
                      Add team members who can be assigned to jobs. Manage their contact information and availability to collaborate effectively on projects.
                    </p>
                  </div>
                  <TeammateManagement />
                </div>
              </TabsContent>
              
              <TabsContent value="packages" className="mt-6">
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h3 className="text-sm font-medium text-orange-900 mb-1">Service Packages</h3>
                    <p className="text-sm text-orange-700">
                      Create reusable service packages with predefined items and pricing. This speeds up invoice creation and ensures consistent pricing for your services.
                    </p>
                  </div>
                  <PackageSettings />
                </div>
              </TabsContent>
              
              <TabsContent value="invoices" className="mt-6">
                <div className="space-y-4">
                  <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                    <h3 className="text-sm font-medium text-cyan-900 mb-1">Invoice Templates</h3>
                    <p className="text-sm text-cyan-700">
                      Create templates with commonly used items, terms, and notes. Save time when creating invoices by starting with pre-configured templates for different types of projects.
                    </p>
                  </div>
                  <InvoiceTemplateSettings />
                </div>
              </TabsContent>
              
              <TabsContent value="contracts" className="mt-6">
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h3 className="text-sm font-medium text-indigo-900 mb-1">Contract Templates</h3>
                    <p className="text-sm text-indigo-700">
                      Create standardized contract templates with your terms and conditions. These can be attached to invoices and require client acceptance before work begins.
                    </p>
                  </div>
                  <ContractTemplateSettings />
                </div>
              </TabsContent>
              
              <TabsContent value="discounts" className="mt-6">
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
                    <h3 className="text-sm font-medium text-rose-900 mb-1">Discount Templates</h3>
                    <p className="text-sm text-rose-700">
                      Set up reusable discount options like early bird specials, referral discounts, or bulk pricing. Apply these quickly when creating invoices to reward loyal clients.
                    </p>
                  </div>
                  <DiscountTemplateSettings />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Settings;
