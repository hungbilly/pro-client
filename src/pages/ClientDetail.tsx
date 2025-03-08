
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClient, getClientInvoices, deleteClient } from '@/lib/storage';
import { Client, Invoice } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import InvoiceList from '@/components/InvoiceList';
import PageTransition from '@/components/ui-custom/PageTransition';
import AnimatedBackground from '@/components/ui-custom/AnimatedBackground';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/sonner';
import { ChevronLeft, Mail, MapPin, Phone, Trash2, UserCog } from 'lucide-react';

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    // Fetch client and invoices
    const fetchedClient = getClient(id);
    if (fetchedClient) {
      setClient(fetchedClient);
      setInvoices(getClientInvoices(id));
    } else {
      toast.error('Client not found');
      navigate('/');
    }
    setLoading(false);
  }, [id, navigate]);

  const handleDeleteClient = () => {
    if (!id) return;
    
    try {
      deleteClient(id);
      toast.success('Client deleted successfully');
      navigate('/');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading client details...</p>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <PageTransition>
      <AnimatedBackground>
        <div className="container px-4 py-8 mx-auto max-w-7xl">
          <Button 
            variant="ghost" 
            className="mb-6" 
            onClick={() => navigate('/')}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            <div className="lg:col-span-1">
              <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
                <CardHeader>
                  <CardTitle>{client.name}</CardTitle>
                  <CardDescription>
                    Client added on {new Date(client.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{client.email}</span>
                    </div>
                    
                    {client.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    
                    {client.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span>{client.address}</span>
                      </div>
                    )}
                  </div>

                  {client.notes && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-medium mb-2">Notes</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{client.notes}</p>
                      </div>
                    </>
                  )}

                  <Separator />
                  
                  <div className="flex flex-col gap-3 pt-3">
                    <Button asChild>
                      <Link to={`/invoice/create/${client.id}`}>
                        Create New Invoice
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to={`/client/edit/${client.id}`}>
                        <UserCog className="h-4 w-4 mr-2" />
                        Edit Client
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Client
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {client.name} and all their associated invoices. 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteClient}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <InvoiceList 
                invoices={invoices}
                client={client}
              />
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </PageTransition>
  );
};

export default ClientDetail;
