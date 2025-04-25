
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { saveClient, updateClient } from '@/lib/storage';
import CompanySelector, { useCompany } from './CompanySelector';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ClientFormProps {
  existingClient?: Client;
  onSuccess?: () => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ existingClient, onSuccess }) => {
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState(existingClient?.name || '');
  const [email, setEmail] = useState(existingClient?.email || '');
  const [phone, setPhone] = useState(existingClient?.phone || '');
  const [address, setAddress] = useState(existingClient?.address || '');
  const [notes, setNotes] = useState(existingClient?.notes || '');

  const createClientMutation = useMutation({
    mutationFn: saveClient,
    onSuccess: () => {
      toast.success('Client created successfully!');
      // Invalidate the clients query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['clients', selectedCompanyId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/');
      }
    },
    onError: (error) => {
      console.error('Failed to save client:', error);
      toast.error('Failed to save client');
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: updateClient,
    onSuccess: () => {
      toast.success('Client updated successfully!');
      // Invalidate the clients query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['clients', selectedCompanyId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/');
      }
    },
    onError: (error) => {
      console.error('Failed to update client:', error);
      toast.error('Failed to update client');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }

    if (!name) {
      toast.error('Please provide a client name');
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
        updateClientMutation.mutate(updatedClient);
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
        createClientMutation.mutate(newClient);
      }
    } catch (error) {
      console.error('Failed to save client:', error);
      toast.error('Failed to save client');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3">
          <div>
            <Label htmlFor="company">Company</Label>
            <CompanySelector className="w-full" />
          </div>
          
          <div>
            <Label htmlFor="name">Name *</Label>
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
            />
          </div>
          
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Client address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this client"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      
        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" type="button" onClick={onSuccess || (() => navigate('/'))}>
            Cancel
          </Button>
          <Button type="submit" disabled={createClientMutation.isPending || updateClientMutation.isPending}>
            {(createClientMutation.isPending || updateClientMutation.isPending) 
              ? 'Saving...' 
              : existingClient 
                ? 'Update Client' 
                : 'Create Client'
            }
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
