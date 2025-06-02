
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, FileText, Settings as SettingsIcon, Package, Users, Calendar, Sparkles, Zap, Crown, Gift, Receipt, ScrollText, Percent } from 'lucide-react';
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
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-1 h-auto p-1 bg-muted">
                <TabsTrigger value="company" className="flex flex-col items-center gap-1 justify-center px-2 py-2 text-xs sm:text-sm min-h-[4rem] whitespace-normal text-center leading-tight bg-gradient-to-br from-blue-500 to-blue-600 data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 text-white border-0 hover:from-blue-400 hover:to-blue-500 transition-all duration-200">
                  <Building2 className="h-5 w-5 flex-shrink-0" />
                  <span className="leading-tight">Company</span>
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex flex-col items-center gap-1 justify-center px-2 py-2 text-xs sm:text-sm min-h-[4rem] whitespace-normal text-center leading-tight bg-gradient-to-br from-emerald-500 to-emerald-600 data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-700 text-white border-0 hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200">
                  <Calendar className="h-5 w-5 flex-shrink-0" />
                  <span className="leading-tight">Calendar</span>
                </TabsTrigger>
                <TabsTrigger value="teammates" className="flex flex-col items-center gap-1 justify-center px-2 py-2 text-xs sm:text-sm min-h-[4rem] whitespace-normal text-center leading-tight bg-gradient-to-br from-purple-500 to-purple-600 data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 text-white border-0 hover:from-purple-400 hover:to-purple-500 transition-all duration-200">
                  <Users className="h-5 w-5 flex-shrink-0" />
                  <span className="leading-tight">Team</span>
                </TabsTrigger>
                <TabsTrigger value="packages" className="flex flex-col items-center gap-1 justify-center px-2 py-2 text-xs sm:text-sm min-h-[4rem] whitespace-normal text-center leading-tight bg-gradient-to-br from-amber-500 to-amber-600 data-[state=active]:from-amber-600 data-[state=active]:to-amber-700 text-white border-0 hover:from-amber-400 hover:to-amber-500 transition-all duration-200">
                  <Package className="h-5 w-5 flex-shrink-0" />
                  <span className="leading-tight">Packages</span>
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex flex-col items-center gap-1 justify-center px-2 py-2 text-xs sm:text-sm min-h-[4rem] whitespace-normal text-center leading-tight bg-gradient-to-br from-teal-500 to-teal-600 data-[state=active]:from-teal-600 data-[state=active]:to-teal-700 text-white border-0 hover:from-teal-400 hover:to-teal-500 transition-all duration-200">
                  <Receipt className="h-5 w-5 flex-shrink-0" />
                  <span className="leading-tight">Invoice Templates</span>
                </TabsTrigger>
                <TabsTrigger value="contracts" className="flex flex-col items-center gap-1 justify-center px-2 py-2 text-xs sm:text-sm min-h-[4rem] whitespace-normal text-center leading-tight bg-gradient-to-br from-indigo-500 to-indigo-600 data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-700 text-white border-0 hover:from-indigo-400 hover:to-indigo-500 transition-all duration-200">
                  <ScrollText className="h-5 w-5 flex-shrink-0" />
                  <span className="leading-tight">Contract Templates</span>
                </TabsTrigger>
                <TabsTrigger value="discounts" className="flex flex-col items-center gap-1 justify-center px-2 py-2 text-xs sm:text-sm min-h-[4rem] whitespace-normal text-center leading-tight bg-gradient-to-br from-rose-500 to-rose-600 data-[state=active]:from-rose-600 data-[state=active]:to-rose-700 text-white border-0 hover:from-rose-400 hover:to-rose-500 transition-all duration-200">
                  <Percent className="h-5 w-5 flex-shrink-0" />
                  <span className="leading-tight">Discount Templates</span>
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
