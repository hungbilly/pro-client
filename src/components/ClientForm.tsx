
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { saveClient, updateClient } from '@/lib/storage';
import CompanySelector, { useCompany } from './CompanySelector';

interface ClientFormProps {
  client?: Client;
}

const ClientForm: React.FC<ClientFormProps> = ({ client: existingClient }) => {
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompany();
  
  const [name, setName] = useState(existingClient?.name || '');
  const [email, setEmail] = useState(existingClient?.email || '');
  const [phone, setPhone] = useState(existingClient?.phone || '');
  const [address, setAddress] = useState(existingClient?.address || '');
  const [notes, setNotes] = useState(existingClient?.notes || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }

    if (!name || !email || !phone || !address) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (existingClient) {
        // Update existing client
        const updatedClient: Client = {
          id: existingClient.id,
          name,
          email,
          phone,
          address,
          notes,
          createdAt: existingClient.createdAt,
          companyId: selectedCompanyId
        };
        await updateClient(updatedClient);
        toast.success('Client updated successfully!');
      } else {
        // Create new client
        const newClient = {
          name,
          email,
          phone,
          address,
          notes,
          companyId: selectedCompanyId
        };
        await saveClient(newClient);
        toast.success('Client created successfully!');
      }
      navigate('/');
    } catch (error) {
      console.error('Failed to save client:', error);
      toast.error('Failed to save client');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{existingClient ? 'Edit Client' : 'New Client'}</CardTitle>
        <CardDescription>
          {existingClient ? 'Update client information' : 'Enter client details to add them to your system'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <Label htmlFor="company">Company</Label>
            <CompanySelector className="w-full" />
          </div>
          
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Client name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Client address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this client"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => navigate('/')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          {existingClient ? 'Update Client' : 'Create Client'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClientForm;
