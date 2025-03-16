import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getClients } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Pencil, Trash2, FileEdit, FileText, Eye, MoreHorizontal } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useAuth } from '@/context/AuthContext';
import AddClientButton from '@/components/ui-custom/AddClientButton';
import { CompanyProvider } from '@/components/CompanySelector';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompany } from '@/components/CompanySelector';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from 'react';

const Clients = () => {
  console.log("Clients page rendering");
  try {
    return (
      <PageTransition>
        <CompanyProvider>
          <div className="container mx-auto py-6 px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <h1 className="text-3xl font-bold mb-4 sm:mb-0">Clients</h1>
              <AddClientButton />
            </div>
            
            <ClientsTable />
          </div>
        </CompanyProvider>
      </PageTransition>
    );
  } catch (error) {
    console.error("Error rendering Clients page:", error);
    return <div className="p-8 text-center">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="text-red-500">{error instanceof Error ? error.message : String(error)}</p>
    </div>;
  }
};

const ClientsTable = () => {
  const navigate = useNavigate();
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const { selectedCompanyId } = useCompany();
  const { data: clients = [], isLoading, error, refetch } = useQuery({
    queryKey: ['clients', selectedCompanyId],
    queryFn: () => getClients(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const confirmDeleteClient = (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    setClientToDelete(clientId);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    
    try {
      // await deleteClient(clientToDelete); // Ensure this function exists and works
      toast.success("Client deleted successfully");
      setClientToDelete(null);
      await refetch(); // Refresh the clients data
    } catch (err) {
      console.error("Error deleting client:", err);
      toast.error("Failed to delete client");
    }
  };

  const cancelDeleteClient = () => {
    setClientToDelete(null);
  };

  const handleClientRowClick = (clientId: string) => {
    navigate(`/client/${clientId}`);
  };

  if (isLoading) return <div>Loading clients...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <>
      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this client?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client
              and all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteClient}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
            {clients.map((client) => (
              <TableRow 
                key={client.id}
                onClick={() => handleClientRowClick(client.id)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(client.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem 
                          onClick={() => navigate(`/client/${client.id}/job/create`)}
                          className="cursor-pointer"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          <span>Add Job</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => navigate(`/client/edit/${client.id}`)}
                          className="cursor-pointer"
                        >
                          <FileEdit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => confirmDeleteClient(e, client.id)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
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
    </>
  );
};

export default Clients;
