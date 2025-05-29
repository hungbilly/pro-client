
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, FileText, Settings as SettingsIcon, Package, Users } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import CompanySettings from '@/components/CompanySettings';
import InvoiceTemplateSettings from '@/components/InvoiceTemplateSettings';
import ContractTemplateSettings from '@/components/ContractTemplateSettings';
import DiscountTemplateSettings from '@/components/DiscountTemplateSettings';
import PackageSettings from '@/components/PackageSettings';
import TeammateManagement from '@/components/teammates/TeammateManagement';

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
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="company" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company
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
                <CompanySettings />
              </TabsContent>
              
              <TabsContent value="teammates" className="mt-6">
                <TeammateManagement />
              </TabsContent>
              
              <TabsContent value="packages" className="mt-6">
                <PackageSettings />
              </TabsContent>
              
              <TabsContent value="invoices" className="mt-6">
                <InvoiceTemplateSettings />
              </TabsContent>
              
              <TabsContent value="contracts" className="mt-6">
                <ContractTemplateSettings />
              </TabsContent>
              
              <TabsContent value="discounts" className="mt-6">
                <DiscountTemplateSettings />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Settings;
