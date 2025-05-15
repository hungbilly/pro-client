
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageTransition from '@/components/ui-custom/PageTransition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const Expenses: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Expenses Management</h1>
          <Button className="flex items-center gap-1">
            <PlusCircle className="w-4 h-4" />
            <span>Add Expense</span>
          </Button>
        </div>
        
        <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
          <CardHeader>
            <CardTitle>Expense Tracking</CardTitle>
            <CardDescription>Manage and monitor all your business expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="all">All Expenses</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <div className="p-4 border rounded-md">
                  <p>All expenses will be displayed here.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="recent">
                <div className="p-4 border rounded-md">
                  <p>Recent expenses will be displayed here.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="categories">
                <div className="p-4 border rounded-md">
                  <p>Expense categories will be displayed here.</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Expenses;
