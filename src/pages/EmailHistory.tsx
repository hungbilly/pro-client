
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Mail, 
  AlertCircle, 
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';

const EmailHistory = () => {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchEmails();
  }, [page, search]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      
      // Count total for pagination
      const countQuery = supabase
        .from('email_history')
        .select('id', { count: 'exact' });
        
      if (search) {
        countQuery.or(`recipient_email.ilike.%${search}%,subject.ilike.%${search}%`);
      }
      
      const { count, error: countError } = await countQuery;
      
      if (countError) throw countError;
      
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
      // Fetch emails
      let query = supabase
        .from('email_history')
        .select('*')
        .order('sent_at', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);
        
      if (search) {
        query = query.or(`recipient_email.ilike.%${search}%,subject.ilike.%${search}%`);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching email history:', error);
      toast.error('Failed to load email history');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on new search
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="success">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'scheduled':
        return <Badge variant="outline"><Calendar className="h-3 w-3 mr-1" /> Scheduled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Email History</CardTitle>
            <CardDescription>View all sent emails</CardDescription>
          </div>
          <div className="flex items-center mt-4 sm:mt-0">
            <div className="relative w-full sm:w-auto mr-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search emails..."
                className="pl-8 w-full"
                value={search}
                onChange={handleSearchChange}
              />
            </div>
            <Button 
              size="icon" 
              variant="outline" 
              onClick={fetchEmails}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button asChild className="ml-2">
              <Link to="/admin/send-email">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && emails.length === 0 ? (
            <div className="flex justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No emails found</h3>
              <p className="text-muted-foreground mt-2">
                {search ? 'Try a different search term.' : 'There are no sent emails yet.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emails.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell>{email.recipient_email}</TableCell>
                        <TableCell>{email.subject}</TableCell>
                        <TableCell>{formatDate(email.sent_at)}</TableCell>
                        <TableCell>{getStatusBadge(email.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous</span>
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next</span>
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailHistory;
