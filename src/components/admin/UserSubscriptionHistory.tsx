
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/utils";

interface UserSubscriptionHistoryProps {
  userId: string;
}

interface HistoryItem {
  id: string;
  user_id: string;
  admin_id: string;
  previous_status: string | null;
  new_status: string;
  previous_trial_end_date: string | null;
  new_trial_end_date: string | null;
  notes: string | null;
  created_at: string;
  admin_email?: string;
}

const UserSubscriptionHistory: React.FC<UserSubscriptionHistoryProps> = ({ userId }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('user_subscription_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Fetch admin emails
      const adminIds = data.map(item => item.admin_id);
      const { data: adminData, error: adminError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', adminIds);
        
      if (adminError) throw adminError;
      
      // Map admin emails to history items
      const historyWithAdmins = data.map(historyItem => {
        const admin = adminData.find(a => a.id === historyItem.admin_id);
        return {
          ...historyItem,
          admin_email: admin?.email || 'Unknown'
        };
      });
      
      setHistory(historyWithAdmins);
    } catch (err: any) {
      console.error('Error fetching subscription history:', err);
      setError(err.message || 'Failed to load subscription history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchHistory();
    }
  }, [userId]);

  const getStatusBadgeVariant = (status: string | null) => {
    if (!status) return "secondary";
    
    switch (status.toLowerCase()) {
      case 'active': return "success";
      case 'trialing': return "warning";
      case 'inactive': return "destructive";
      default: return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Subscription History</CardTitle>
          <CardDescription>
            History of subscription status changes by admins
          </CardDescription>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchHistory} 
          disabled={!userId || loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!userId ? (
          <div className="text-center text-muted-foreground py-4">
            Select a user to view subscription history
          </div>
        ) : loading ? (
          <div className="text-center py-4">
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No subscription history found for this user
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Trial End Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {item.admin_email?.split('@')[0] || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {item.previous_status && (
                        <Badge variant={getStatusBadgeVariant(item.previous_status)} className="mr-2">
                          {item.previous_status}
                        </Badge>
                      )}
                      <span className="mx-1">→</span>
                      <Badge variant={getStatusBadgeVariant(item.new_status)}>
                        {item.new_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.previous_trial_end_date && (
                        <span className="mr-2 text-sm text-muted-foreground">
                          {formatDate(item.previous_trial_end_date)}
                        </span>
                      )}
                      {item.previous_trial_end_date && item.new_trial_end_date && (
                        <span className="mx-1">→</span>
                      )}
                      {item.new_trial_end_date && (
                        <span className="text-sm">
                          {formatDate(item.new_trial_end_date)}
                        </span>
                      )}
                      {!item.previous_trial_end_date && !item.new_trial_end_date && (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.notes || <span className="text-muted-foreground">No notes</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserSubscriptionHistory;
