import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from 'date-fns';
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Client, Job } from '@/types';
import { saveClient, saveJob, getClients } from '@/lib/storage';
import { v4 as generateUUID } from 'uuid';
import { useCompany } from '@/components/CompanySelector';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CalendarTest = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobStartTime, setJobStartTime] = useState('');
  const [jobEndTime, setJobEndTime] = useState('');
  const [isFullDay, setIsFullDay] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const { toast } = useToast();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      if (!selectedCompany) return;
      const clientsData = await getClients(selectedCompany.id);
      setClients(clientsData);
    };

    fetchClients();
  }, [selectedCompany]);

  const handleClientDialogOpen = () => {
    setIsClientDialogOpen(true);
  };

  const handleClientDialogClose = () => {
    setIsClientDialogOpen(false);
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setClientAddress('');
  };

  const handleJobDialogOpen = () => {
    setIsJobDialogOpen(true);
  };

  const handleJobDialogClose = () => {
    setIsJobDialogOpen(false);
    setJobTitle('');
    setJobDescription('');
    setJobLocation('');
    setJobStartTime('');
    setJobEndTime('');
    setIsFullDay(false);
    setSelectedClient(null);
  };

  const handleCreateClient = async () => {
    if (!clientName || !clientEmail || !clientPhone || !clientAddress) {
      toast({
        title: "Error",
        description: "Please fill in all client details.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCompany) {
      toast({
        title: "Error",
        description: "Please select a company first.",
        variant: "destructive",
      });
      return;
    }

    const newClient: Client = {
      id: generateUUID(),
      name: clientName,
      email: clientEmail,
      phone: clientPhone,
      address: clientAddress,
      createdAt: new Date().toISOString(),
      notes: '',
      companyId: selectedCompany?.id || '', // Add the required companyId property
    };

    try {
      await saveClient(newClient);
      setClients([...clients, newClient]);
      toast({
        title: "Success",
        description: "Client created successfully.",
      });
      handleClientDialogClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create client.",
        variant: "destructive",
      });
    }
  };

  const handleCreateJob = async () => {
    if (!jobTitle || !jobDescription || !jobLocation || !jobStartTime || !jobEndTime || !selectedClient) {
      toast({
        title: "Error",
        description: "Please fill in all job details.",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Error",
        description: "Please select a date for the job.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCompany) {
      toast({
        title: "Error",
        description: "Please select a company first.",
        variant: "destructive",
      });
      return;
    }

    const newJob: Job = {
      id: generateUUID(),
      clientId: selectedClient,
      companyId: selectedCompany.id,
      title: jobTitle,
      description: jobDescription,
      status: 'active',
      date: format(date, 'yyyy-MM-dd'),
      location: jobLocation,
      startTime: jobStartTime,
      endTime: jobEndTime,
      isFullDay: isFullDay,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    try {
      await saveJob(newJob);
      toast({
        title: "Success",
        description: "Job created successfully.",
      });
      handleJobDialogClose();
      navigate(`/job/${newJob.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-5">Calendar</h1>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 md:space-x-4 mb-5">
        <p className="text-muted-foreground">Select a date to view or create jobs.</p>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <DayPicker
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={user ? false : true}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {date && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Client</CardTitle>
              <CardDescription>Add a new client to the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleClientDialogOpen} className="w-full">
                Create Client
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create New Job</CardTitle>
              <CardDescription>Create a new job for the selected date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleJobDialogOpen} className="w-full">
                Create Job
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Client Dialog */}
      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Add a new client to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" value={clientName} onChange={(e) => setClientName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input id="email" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input id="phone" type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Textarea id="address" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClientDialogClose}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleCreateClient}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Dialog */}
      <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
            <DialogDescription>
              Add a new job for the selected date.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">
                Client
              </Label>
              <Select onValueChange={setSelectedClient}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input id="title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea id="description" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Input id="location" value={jobLocation} onChange={(e) => setJobLocation(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">
                Start Time
              </Label>
              <Input type="time" id="startTime" value={jobStartTime} onChange={(e) => setJobStartTime(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">
                End Time
              </Label>
              <Input type="time" id="endTime" value={jobEndTime} onChange={(e) => setJobEndTime(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isFullDay" className="text-right">
                Full Day
              </Label>
              <Checkbox id="isFullDay" checked={isFullDay} onCheckedChange={setIsFullDay} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleJobDialogClose}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleCreateJob}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarTest;
