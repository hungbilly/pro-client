
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileEdit, MoreHorizontal, Users, Search, Briefcase } from 'lucide-react';
import AddClientButton from '../ui-custom/AddClientButton';

interface ClientsTabContentProps {
  clients: Client[];
  onDeleteClient: (e: React.MouseEvent, clientId: string) => void;
}

const ClientsTabContent: React.FC<ClientsTabContentProps> = ({ clients, onDeleteClient }) => {
  const navigate = useNavigate();
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  const sortedClients = [...clients]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter(client => 
      client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || 
      client.email.toLowerCase().includes(clientSearchQuery.toLowerCase()) || 
      client.phone.toLowerCase().includes(clientSearchQuery.toLowerCase())
    );

  const handleClientRowClick = (clientId: string) => {
    navigate(`/client/${clientId}`);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Your Clients</h2>
        <AddClientButton />
      </div>
      
      <div className="relative mb-4">
        <Input 
          placeholder="Search clients by name, email, or phone..." 
          value={clientSearchQuery} 
          onChange={e => setClientSearchQuery(e.target.value)} 
          className="pr-10" 
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      </div>
      
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Clients Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            You haven't added any clients yet. Add your first client to get started.
          </p>
          <AddClientButton />
        </div>
      ) : sortedClients.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No clients match your search</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden md:table-cell">Added On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClients.map(client => (
                <TableRow key={client.id} onClick={() => handleClientRowClick(client.id)} className="cursor-pointer">
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => navigate(`/client/${client.id}/job/create`)} className="cursor-pointer">
                            <Briefcase className="mr-2 h-4 w-4" />
                            <span>Add Job</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/client/${client.id}/edit`)} className="cursor-pointer">
                            <FileEdit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
};

export default ClientsTabContent;
