
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import PageTransition from '@/components/ui-custom/PageTransition';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Building, 
  Users, 
  Briefcase, 
  Receipt,
  Settings,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Tutorial = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center mb-10 text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to ProClient</h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            Your complete solution for managing clients, jobs, invoices, and more.
            This guide will help you understand all the features and get the most out of the application.
          </p>
        </div>

        <Tabs defaultValue="intro" className="space-y-8">
          <TabsList className="flex flex-wrap gap-2 h-auto w-full justify-center">
            <TabsTrigger value="intro" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Introduction
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Company Management
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Client Management
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Job Management
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Invoice Management
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Introduction */}
          <TabsContent value="intro">
            <Card>
              <CardContent className="pt-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  <h2 className="text-3xl font-bold mb-6">Welcome to ProClient</h2>
                  
                  <div className="space-y-4">
                    <p className="text-lg">
                      ProClient is designed for photographers, videographers, and creative professionals 
                      who need a simple yet powerful way to manage their business operations.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
                      <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                        <h3 className="text-xl font-semibold mb-3">Main Features</h3>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            Client management
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            Job tracking
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            Invoice creation and management
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            Package and price templates
                          </li>
                        </ul>
                      </div>
                      <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                        <h3 className="text-xl font-semibold mb-3">Key Benefits</h3>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            Save time on administrative tasks
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            Create professional client experiences
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            Track payments and manage your finances
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            Keep all your business info in one place
                          </li>
                        </ul>
                      </div>
                    </div>

                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-500" />
                      <AlertDescription className="text-blue-700">
                        To get the most out of this tutorial, explore each section using the tabs above.
                        Each section contains step-by-step instructions and helpful tips.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="text-center mt-8">
                      <Button size="lg" onClick={() => navigate('/')}>
                        Go to Dashboard
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Dashboard Overview */}
          <TabsContent value="dashboard">
            <Card>
              <CardContent className="pt-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                    <h2 className="text-3xl font-bold">Dashboard Overview</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Understanding Your Dashboard</h3>
                      <div className="space-y-4">
                        <p>
                          The dashboard provides a complete overview of your business operations at a glance.
                          Here's what you'll find:
                        </p>
                        
                        <div className="space-y-4 my-6">
                          <div className="border-l-4 border-blue-500 pl-4 py-2">
                            <h4 className="font-medium text-lg">Analytics Section</h4>
                            <p className="text-muted-foreground">
                              Shows key metrics including recent revenue, upcoming jobs, and outstanding invoices.
                              Use this to quickly gauge your business performance.
                            </p>
                          </div>
                          
                          <div className="border-l-4 border-blue-500 pl-4 py-2">
                            <h4 className="font-medium text-lg">Tabs Navigation</h4>
                            <p className="text-muted-foreground">
                              Below the analytics section, you'll find tabs that let you switch between 
                              Clients, Jobs, and Invoices views without leaving the dashboard.
                            </p>
                          </div>
                          
                          <div className="border-l-4 border-blue-500 pl-4 py-2">
                            <h4 className="font-medium text-lg">Quick Actions</h4>
                            <p className="text-muted-foreground">
                              Look for action buttons like "Add Client", "New Job", and "Create Invoice" 
                              that let you quickly perform common tasks.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Working with Dashboard Tabs</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2 text-blue-600">
                            <Users className="h-5 w-5" />
                            <h4 className="font-medium">Clients Tab</h4>
                          </div>
                          <p className="text-sm">
                            View all your clients, search, sort, and access detailed information with a single click.
                          </p>
                        </div>
                        
                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2 text-green-600">
                            <Briefcase className="h-5 w-5" />
                            <h4 className="font-medium">Jobs Tab</h4>
                          </div>
                          <p className="text-sm">
                            Monitor all your jobs, their status, associated clients, and scheduled dates.
                          </p>
                        </div>
                        
                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2 text-amber-600">
                            <Receipt className="h-5 w-5" />
                            <h4 className="font-medium">Invoices Tab</h4>
                          </div>
                          <p className="text-sm">
                            Track all invoices, their status, amounts, and payment information.
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-md">
                        <h4 className="font-medium flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          Pro Tip
                        </h4>
                        <p className="text-sm">
                          Use the search functionality in each tab to quickly find specific clients, jobs, or invoices 
                          based on names, emails, dates, or any other relevant information.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-center mt-6">
                      <Button variant="outline" onClick={() => navigate('/')}>
                        Go to Dashboard
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Company Management */}
          <TabsContent value="company">
            <Card>
              <CardContent className="pt-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Building className="h-6 w-6 text-primary" />
                    <h2 className="text-3xl font-bold">Company Management</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Managing Your Companies</h3>
                      <p className="mb-4">
                        ProClient allows you to manage multiple companies or brands from a single account. 
                        This is perfect if you operate different photography services under separate brand names.
                      </p>
                      
                      <div className="space-y-4 my-6">
                        <div className="bg-slate-50 p-4 rounded-md">
                          <h4 className="font-medium mb-2">Switching Between Companies</h4>
                          <ol className="list-decimal list-inside space-y-2 text-sm ml-4">
                            <li>Click on the company selector dropdown in the top navigation bar</li>
                            <li>Select the company you want to work with from the dropdown list</li>
                            <li>All data will automatically update to show the selected company's information</li>
                          </ol>
                        </div>
                        
                        <Alert className="bg-blue-50 border-blue-200">
                          <AlertCircle className="h-4 w-4 text-blue-500" />
                          <AlertDescription className="text-blue-700">
                            Switching companies will change all data displayed throughout the app, 
                            including clients, jobs, invoices, and settings.
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Setting Up Your Company</h3>
                      
                      <div className="space-y-4">
                        <div className="border-l-4 border-green-500 pl-4 py-2">
                          <h4 className="font-medium">1. Create a New Company</h4>
                          <p className="text-muted-foreground">
                            Go to Settings → Company and click "Add Company" to create a new company profile.
                          </p>
                        </div>
                        
                        <div className="border-l-4 border-green-500 pl-4 py-2">
                          <h4 className="font-medium">2. Update Company Details</h4>
                          <p className="text-muted-foreground">
                            Fill in your company information, including name, address, contact details, and logo.
                            This information will appear on your invoices and client communications.
                          </p>
                        </div>
                        
                        <div className="border-l-4 border-green-500 pl-4 py-2">
                          <h4 className="font-medium">3. Set as Default (Optional)</h4>
                          <p className="text-muted-foreground">
                            If you have multiple companies, you can set one as your default company.
                            This company will be automatically selected when you log in.
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-md mt-6">
                        <h4 className="font-medium flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          Pro Tip
                        </h4>
                        <p className="text-sm">
                          Completely set up each company profile with logo and contact details before adding clients and jobs.
                          This ensures your documentation looks professional from day one.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-center mt-6">
                      <Button variant="outline" onClick={() => navigate('/settings')}>
                        Go to Company Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Client Management */}
          <TabsContent value="clients">
            <Card>
              <CardContent className="pt-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="h-6 w-6 text-primary" />
                    <h2 className="text-3xl font-bold">Client Management</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Adding a New Client</h3>
                      
                      <div className="space-y-4">
                        <ol className="space-y-6 list-none ml-0">
                          <li className="relative pl-8 before:content-['1'] before:absolute before:left-0 before:top-0 before:flex before:items-center before:justify-center before:w-6 before:h-6 before:rounded-full before:bg-primary before:text-white before:text-sm">
                            <h4 className="font-medium">Click "Add Client"</h4>
                            <p className="text-muted-foreground">
                              From the dashboard or clients page, click the "Add Client" button in the header.
                            </p>
                          </li>
                          
                          <li className="relative pl-8 before:content-['2'] before:absolute before:left-0 before:top-0 before:flex before:items-center before:justify-center before:w-6 before:h-6 before:rounded-full before:bg-primary before:text-white before:text-sm">
                            <h4 className="font-medium">Fill Client Information</h4>
                            <p className="text-muted-foreground">
                              Enter client details including name, email, phone number, and any additional contact information.
                            </p>
                          </li>
                          
                          <li className="relative pl-8 before:content-['3'] before:absolute before:left-0 before:top-0 before:flex before:items-center before:justify-center before:w-6 before:h-6 before:rounded-full before:bg-primary before:text-white before:text-sm">
                            <h4 className="font-medium">Add Address (Optional)</h4>
                            <p className="text-muted-foreground">
                              Include the client's address if needed for invoicing or contracts.
                            </p>
                          </li>
                          
                          <li className="relative pl-8 before:content-['4'] before:absolute before:left-0 before:top-0 before:flex before:items-center before:justify-center before:w-6 before:h-6 before:rounded-full before:bg-primary before:text-white before:text-sm">
                            <h4 className="font-medium">Save Client</h4>
                            <p className="text-muted-foreground">
                              Click "Save" to add the client to your database. They will now appear in your clients list.
                            </p>
                          </li>
                        </ol>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Managing Clients</h3>
                      
                      <div className="space-y-6">
                        <div className="rounded-lg border p-4">
                          <h4 className="font-medium">Viewing Client Details</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Click on any client in your list to view their complete profile, including:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              Contact information
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              Associated jobs
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              Invoice history
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              Notes and additional details
                            </div>
                          </div>
                        </div>
                        
                        <div className="rounded-lg border p-4">
                          <h4 className="font-medium">Editing Client Information</h4>
                          <ol className="list-decimal list-inside space-y-1 text-sm ml-4 mt-2">
                            <li>From the client's detail page, click the "Edit" button</li>
                            <li>Update any information that needs changing</li>
                            <li>Save changes to update the client record</li>
                          </ol>
                        </div>
                        
                        <div className="rounded-lg border p-4">
                          <h4 className="font-medium">Searching and Filtering Clients</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Use the search bar in the clients table to quickly find clients by:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                            <Badge variant="outline" className="justify-center">Name</Badge>
                            <Badge variant="outline" className="justify-center">Email</Badge>
                            <Badge variant="outline" className="justify-center">Phone number</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-md mt-6">
                        <h4 className="font-medium flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          Pro Tip
                        </h4>
                        <p className="text-sm">
                          Add detailed notes to client profiles about their preferences, important dates, 
                          or special requirements. This helps personalize your interactions and improve client satisfaction.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-center mt-6">
                      <Button variant="outline" onClick={() => navigate('/clients')}>
                        Go to Clients
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Job Management */}
          <TabsContent value="jobs">
            <Card>
              <CardContent className="pt-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Briefcase className="h-6 w-6 text-primary" />
                    <h2 className="text-3xl font-bold">Job Management</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Creating Jobs</h3>
                      
                      <div className="space-y-5">
                        <p>
                          Jobs represent your photography or creative projects. Each job is connected to a client
                          and can be used to generate invoices.
                        </p>
                        
                        <div className="space-y-6">
                          <div className="border-l-4 border-green-500 pl-4 py-2">
                            <h4 className="font-medium">Create from Dashboard</h4>
                            <p className="text-muted-foreground">
                              Click "New Job" button in the dashboard and select a client to associate with the job.
                            </p>
                          </div>
                          
                          <div className="border-l-4 border-green-500 pl-4 py-2">
                            <h4 className="font-medium">Create from Client Profile</h4>
                            <p className="text-muted-foreground">
                              Navigate to a client's profile and click "Add Job" to create a job directly linked to that client.
                            </p>
                          </div>
                          
                          <div className="border-l-4 border-green-500 pl-4 py-2">
                            <h4 className="font-medium">Required Information</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Job Title: Clear name for the project</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Date: When the job will take place</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Status: Current state of the job</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Description: Details about the shoot</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Job Status and Tracking</h3>
                      
                      <div className="space-y-4">
                        <p>
                          Track jobs through their entire lifecycle from inquiry to completion with status tracking.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                          <div className="border p-3 rounded-md">
                            <h4 className="font-medium mb-2">Status Options</h4>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-slate-100">Inquiry</Badge>
                                <span className="text-xs text-muted-foreground">Initial client contact</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700">Confirmed</Badge>
                                <span className="text-xs text-muted-foreground">Job booked and scheduled</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-amber-50 text-amber-700">In Progress</Badge>
                                <span className="text-xs text-muted-foreground">Actively working on the job</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-green-50 text-green-700">Completed</Badge>
                                <span className="text-xs text-muted-foreground">Work delivered to client</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-red-50 text-red-700">Cancelled</Badge>
                                <span className="text-xs text-muted-foreground">Job no longer happening</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border p-3 rounded-md">
                            <h4 className="font-medium mb-2">Updating Job Status</h4>
                            <ol className="list-decimal list-inside text-sm ml-2 space-y-2">
                              <li>Open the job details page</li>
                              <li>Click the "Edit" button</li>
                              <li>Select the new status from the dropdown</li>
                              <li>Save changes to update the job status</li>
                            </ol>
                            <p className="text-xs text-muted-foreground mt-2">
                              Job status is color-coded throughout the app for easy visual tracking
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-md">
                          <h4 className="font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            Calendar Integration
                          </h4>
                          <p className="text-sm">
                            When you create or update a job with a specific date, you can add the event to Google Calendar 
                            directly from the job page. This helps you keep track of your photography schedule across platforms.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-center mt-6">
                      <Button variant="outline" onClick={() => navigate('/jobs')}>
                        Go to Jobs
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Invoice Management */}
          <TabsContent value="invoices">
            <Card>
              <CardContent className="pt-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Receipt className="h-6 w-6 text-primary" />
                    <h2 className="text-3xl font-bold">Invoice Management</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Creating Invoices</h3>
                      
                      <div className="space-y-4">
                        <p>
                          Generate professional invoices for your jobs with customizable templates, payment schedules,
                          and contract terms.
                        </p>
                        
                        <ol className="space-y-6 list-none ml-0">
                          <li className="relative pl-8 before:content-['1'] before:absolute before:left-0 before:top-0 before:flex before:items-center before:justify-center before:w-6 before:h-6 before:rounded-full before:bg-primary before:text-white before:text-sm">
                            <h4 className="font-medium">Start from a Job</h4>
                            <p className="text-muted-foreground">
                              Navigate to a job's detail page and click "Create Invoice" to generate an invoice 
                              pre-filled with the job information.
                            </p>
                          </li>
                          
                          <li className="relative pl-8 before:content-['2'] before:absolute before:left-0 before:top-0 before:flex before:items-center before:justify-center before:w-6 before:h-6 before:rounded-full before:bg-primary before:text-white before:text-sm">
                            <h4 className="font-medium">Fill Invoice Details</h4>
                            <p className="text-muted-foreground">
                              Enter the invoice amount, due date, and any additional notes. You can also select from your 
                              pre-defined packages and apply discounts.
                            </p>
                          </li>
                          
                          <li className="relative pl-8 before:content-['3'] before:absolute before:left-0 before:top-0 before:flex before:items-center before:justify-center before:w-6 before:h-6 before:rounded-full before:bg-primary before:text-white before:text-sm">
                            <h4 className="font-medium">Set Payment Schedule (Optional)</h4>
                            <p className="text-muted-foreground">
                              For larger projects, create payment schedules that break the total amount into multiple payments
                              with different due dates (deposits, milestone payments, etc.).
                            </p>
                          </li>
                          
                          <li className="relative pl-8 before:content-['4'] before:absolute before:left-0 before:top-0 before:flex before:items-center before:justify-center before:w-6 before:h-6 before:rounded-full before:bg-primary before:text-white before:text-sm">
                            <h4 className="font-medium">Add Contract Terms (Optional)</h4>
                            <p className="text-muted-foreground">
                              Include contract terms using your pre-defined templates or create custom terms for the specific job.
                            </p>
                          </li>
                          
                          <li className="relative pl-8 before:content-['5'] before:absolute before:left-0 before:top-0 before:flex before:items-center before:justify-center before:w-6 before:h-6 before:rounded-full before:bg-primary before:text-white before:text-sm">
                            <h4 className="font-medium">Save and Send</h4>
                            <p className="text-muted-foreground">
                              Save the invoice and get a unique link you can send to your client for online viewing and payment.
                            </p>
                          </li>
                        </ol>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Managing Payments</h3>
                      
                      <div className="space-y-4 mb-6">
                        <p>
                          Track the payment status of your invoices and log payments as they come in.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                          <div className="border p-3 rounded-md">
                            <h4 className="font-medium mb-2">Invoice Statuses</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-slate-100">Draft</Badge>
                                <span className="text-xs text-muted-foreground">Created but not sent</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700">Sent</Badge>
                                <span className="text-xs text-muted-foreground">Delivered to client</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-amber-50 text-amber-700">Partial</Badge>
                                <span className="text-xs text-muted-foreground">Some payments received</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-green-50 text-green-700">Paid</Badge>
                                <span className="text-xs text-muted-foreground">Fully paid</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-red-50 text-red-700">Overdue</Badge>
                                <span className="text-xs text-muted-foreground">Past due date</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border p-3 rounded-md">
                            <h4 className="font-medium mb-2">Recording Payments</h4>
                            <ol className="list-decimal list-inside text-sm space-y-2 ml-2">
                              <li>Open the invoice details page</li>
                              <li>Click "Record Payment"</li>
                              <li>Enter payment date, amount, and method</li>
                              <li>Save the payment information</li>
                            </ol>
                            <p className="text-xs text-muted-foreground mt-2">
                              The invoice status will automatically update based on the recorded payments.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-md">
                        <h4 className="font-medium flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          Pro Tip
                        </h4>
                        <p className="text-sm">
                          Use the client view link to allow clients to view their invoice online. This link also provides 
                          a professional way for clients to download the invoice as a PDF and sign any contracts included.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-center mt-6">
                      <Button variant="outline" onClick={() => navigate('/invoices')}>
                        Go to Invoices
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Settings and Configuration */}
          <TabsContent value="settings">
            <Card>
              <CardContent className="pt-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Settings className="h-6 w-6 text-primary" />
                    <h2 className="text-3xl font-bold">Settings and Configuration</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Customizing Templates</h3>
                      
                      <div className="space-y-5">
                        <p>
                          Create and customize templates to save time and maintain consistent branding across
                          all your client communications.
                        </p>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
                          <div className="border p-4 rounded-lg">
                            <h4 className="font-medium flex items-center gap-2 mb-3">
                              <Receipt className="h-5 w-5 text-primary" />
                              Invoice Templates
                            </h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              Customize how your invoices look, including:
                            </p>
                            <ul className="space-y-1 text-sm ml-5 list-disc">
                              <li>Layout and design</li>
                              <li>Logo placement</li>
                              <li>Color schemes</li>
                              <li>Header and footer text</li>
                              <li>Payment instructions</li>
                            </ul>
                            <div className="mt-3">
                              <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/settings')}>
                                Edit Invoice Templates
                              </Button>
                            </div>
                          </div>
                          
                          <div className="border p-4 rounded-lg">
                            <h4 className="font-medium flex items-center gap-2 mb-3">
                              <FileText className="h-5 w-5 text-primary" />
                              Contract Templates
                            </h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              Create reusable contract templates for different types of photography work:
                            </p>
                            <ul className="space-y-1 text-sm ml-5 list-disc">
                              <li>Wedding photography</li>
                              <li>Portrait sessions</li>
                              <li>Commercial shoots</li>
                              <li>Event photography</li>
                              <li>Licensing terms</li>
                            </ul>
                            <div className="mt-3">
                              <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/settings')}>
                                Edit Contract Templates
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Package and Price Management</h3>
                      
                      <div className="space-y-4">
                        <p>
                          Create pricing packages and discount templates to streamline your invoicing process.
                        </p>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
                          <div className="border p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Package Settings</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              Define your service packages with preset pricing and descriptions. When creating an invoice,
                              simply select a package to auto-populate details.
                            </p>
                            <div className="bg-slate-50 p-3 rounded-md text-sm">
                              <p className="font-medium mb-1">Example: Wedding Packages</p>
                              <ul className="space-y-1 ml-4 list-disc">
                                <li>Basic (6 hours): $1,500</li>
                                <li>Standard (8 hours): $2,200</li>
                                <li>Premium (10 hours + album): $3,000</li>
                              </ul>
                            </div>
                          </div>
                          
                          <div className="border p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Discount Templates</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              Create reusable discount templates for common promotions or client situations.
                            </p>
                            <div className="bg-slate-50 p-3 rounded-md text-sm">
                              <p className="font-medium mb-1">Example: Discount Types</p>
                              <ul className="space-y-1 ml-4 list-disc">
                                <li>Returning Client: 10% off</li>
                                <li>Early Booking: $200 off</li>
                                <li>Seasonal Promotion: 15% off</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-center mt-4">
                          <Button variant="outline" onClick={() => navigate('/settings')}>
                            Manage Packages & Discounts
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Google Calendar Integration</h3>
                      
                      <div className="space-y-4">
                        <p>
                          Connect your Google Calendar to automatically sync job dates and important events.
                        </p>
                        
                        <div className="bg-slate-50 p-4 rounded-md">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            Benefits of Calendar Integration
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span>Never double-book jobs</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span>Sync job details automatically</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span>Get calendar reminders</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span>Update events when jobs change</span>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <Button size="sm" onClick={() => navigate('/settings')}>
                              Set Up Calendar Integration
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-center mt-6">
                      <Button onClick={() => navigate('/settings')}>
                        Go to Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default Tutorial;
