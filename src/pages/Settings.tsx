
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import CompanySettings from '@/components/CompanySettings';
import { useAuth } from '@/context/AuthContext';

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      toast.error('You must be logged in to view this page');
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <div className="text-center">Loading...</div>
        </div>
      </PageTransition>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Settings</h1>
        
        <Tabs defaultValue="company" className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-1 mb-8">
            <TabsTrigger value="company">Company Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Company Settings</CardTitle>
                <CardDescription>
                  Manage your company information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompanySettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default Settings;
