
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, deleteClient } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Pencil, Trash2, FileEdit, FileText, Eye, MoreHorizontal, Download } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useAuth } from '@/context/AuthContext';
import AddClientButton from '@/components/ui-custom/AddClientButton';
import { toast } from 'sonner';
import SearchBox from '@/components/ui-custom/SearchBox';
import ExportDateRangeDialog from '@/components/ExportDateRangeDialog';
import { exportDataToFile, formatClientsForExport } from '@/utils/exportUtils';
import { DateRange } from 'react-day-picker';
import DateRangeFilter from '@/components/ui-custom/DateRangeFilter';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompanyContext } from '@/context/CompanyContext';
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

const Clients = () => {
  console.log("Clients page rendering");
  try {
    return (
      <PageTransition>
        <div className="container mx-auto py-6 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <h1 className="text-3xl font-bold mb-4 sm:mb-0">Clients</h1>
            <div className="flex gap-2">
              <AddClientButton />
            </div>
          </div>
          
          <ClientsTable />
        </div>
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
  const [isDeleting, setIsDeleting] = useState(false);
  const { selectedCompany } = useCompanyContext();
  const selectedCompanyId = selectedCompany?.id;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  const { data: clients = [], isLoading, error, refetch } = useQuery({
    queryKey: ['clients', selectedCompanyId],
    queryFn: () => getClients(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const deleteClientMutation = useMutation({
    mutationFn: deleteClient,
    onMutate: () => {
      setIsDeleting(true);
    },
    onSuccess: () => {
      toast.success("Client deleted successfully");
      setClientToDelete(null);
      // Invalidate the clients query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['clients', selectedCompanyId] });
      setIsDeleting(false);
    },
    onError: (error) => {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
      setIsDeleting(false);
    }
  });

  const confirmDeleteClient = (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    setClientToDelete(clientId);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete || isDeleting) return;
    deleteClientMutation.mutate(clientToDelete);
  };

  const cancelDeleteClient = () => {
    setClientToDelete(null);
  };

  const handleClientRowClick = (clientId: string) => {
    navigate(`/client/${clientId}`);
  };

  // Filter clients based on search query and date range
  const filteredClients = clients.filter(client => {
    // Text search filter
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Date range filter
    let matchesDateRange = true;
    if (dateRange?.from) {
      const clientDate = new Date(client.createdAt);
      
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        matchesDateRange = clientDate >= fromDate && clientDate <= toDate;
      } else {
        matchesDateRange = clientDate >= fromDate;
      }
    }
    
    return matchesSearch && matchesDateRange;
  });

  const handleExportOpen = () => {
    setIsExportDialogOpen(true);
  };

  const handleExportClose = () => {
    setIsExportDialogOpen(false);
  };

  const handleExport = (format: 'csv' | 'xlsx', exportDateRange: DateRange | null) => {
    const formattedData = formatClientsForExport(filteredClients);
    exportDataToFile(formattedData, {
      filename: 'clients-export',
      format,
      dateRange: exportDateRange || dateRange || null
    });
    toast.success(`Clients exported as ${format.toUpperCase()} successfully`);
  };

  if (isLoading) return <div>Loading clients...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <>
      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && !isDeleting && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this client?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client
              and all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteClient} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClient} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExportDateRangeDialog
        isOpen={isExportDialogOpen}
        onClose={handleExportClose}
        onExport={handleExport}
        title="Export Clients"
        description="Export your clients data as CSV or Excel file"
        count={filteredClients.length}
      />

      <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>All Clients</CardTitle>
          <div className="flex gap-2">
            <DateRangeFilter
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
            <Button variant="outline" onClick={handleExportOpen}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <SearchBox 
            placeholder="Search clients by name, email, or phone..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="mb-4"
          />
          
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
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No clients match your search or date filter
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
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
                                onClick={() => navigate(`/client/${client.id}/edit`)}
                                className="cursor-pointer"
                              >
                                <FileEdit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => confirmDeleteClient(e, client.id)}
                                className="cursor-pointer text-destructive focus:text-destructive"
                                disabled={isDeleting}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>{clientToDelete === client.id && isDeleting ? "Deleting..." : "Delete"}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default Clients;
