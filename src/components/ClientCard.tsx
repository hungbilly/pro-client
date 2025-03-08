
import React from 'react';
import { Link } from 'react-router-dom';
import { Client } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, User, FileText, ChevronRight } from 'lucide-react';

interface ClientCardProps {
  client: Client;
  className?: string;
  compact?: boolean;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, className, compact = false }) => {
  const formattedDate = new Date(client.createdAt).toLocaleDateString();
  
  if (compact) {
    return (
      <Card className={cn("group overflow-hidden transition-all duration-300 hover:shadow-soft", className)}>
        <Link to={`/client/${client.id}`} className="block h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="truncate">{client.name}</span>
              <ChevronRight size={16} className="text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center text-sm text-muted-foreground gap-2">
              <Mail size={14} />
              <span className="truncate">{client.email}</span>
            </div>
          </CardContent>
        </Link>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden transition-all duration-300 hover:shadow-soft", className)}>
      <CardHeader>
        <CardTitle>{client.name}</CardTitle>
        <CardDescription>Added on {formattedDate}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{client.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{client.phone}</span>
        </div>
        {client.notes && (
          <div className="mt-4 text-sm text-muted-foreground line-clamp-2">
            {client.notes}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/client/${client.id}`}>
            <User className="mr-2 h-4 w-4" />
            View Details
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/invoice/create/${client.id}`}>
            <FileText className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClientCard;
