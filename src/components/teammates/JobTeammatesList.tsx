
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Calendar, Mail, Phone, X, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { JobTeammate } from '@/types/teammate';
import { removeTeammateFromJob } from '@/lib/teammateStorage';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface JobTeammatesListProps {
  jobId: string;
  teammates: JobTeammate[];
  onTeammateRemoved?: () => void;
}

const JobTeammatesList: React.FC<JobTeammatesListProps> = ({
  jobId,
  teammates,
  onTeammateRemoved
}) => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [removingTeammates, setRemovingTeammates] = useState<Set<string>>(new Set());

  // Auto-refresh every 2 minutes if there are pending invitations
  useEffect(() => {
    const hasPendingInvitations = teammates.some(
      teammate => teammate.invitation_status === 'sent' || teammate.invitation_status === 'pending'
    );

    if (!hasPendingInvitations) return;

    const interval = setInterval(() => {
      handleRefreshStatus(true); // Silent refresh
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [teammates, jobId]);

  const handleRemoveTeammate = async (jobTeammateId: string, teammateName?: string, teammateEmail?: string) => {
    setRemovingTeammates(prev => new Set(prev).add(jobTeammateId));
    
    try {
      const teammateToRemove = teammates.find(t => t.id === jobTeammateId);
      const displayName = teammateToRemove?.teammate_name || teammateToRemove?.teammate_email || 'teammate';
      
      if (teammateToRemove?.calendar_event_id) {
        toast.loading(`Removing ${displayName} from job and calendar...`);
      } else {
        toast.loading(`Removing ${displayName} from job...`);
      }

      await removeTeammateFromJob(jobTeammateId);
      
      toast.success(`${displayName} removed successfully`);
      queryClient.invalidateQueries({ queryKey: ['job-teammates', jobId] });
      onTeammateRemoved?.();
    } catch (error) {
      console.error('Error removing teammate:', error);
      toast.error('Failed to remove teammate');
    } finally {
      setRemovingTeammates(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobTeammateId);
        return newSet;
      });
    }
  };

  const handleRefreshStatus = async (silent = false) => {
    setIsRefreshing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-calendar-responses', {
        body: { jobId }
      });

      if (error) {
        console.error('Error checking calendar responses:', error);
        if (!silent) {
          toast.error('Failed to refresh teammate status');
        }
        return;
      }

      if (data?.success) {
        const updatedCount = data.results?.filter((r: any) => r.updated)?.length || 0;
        
        if (updatedCount > 0) {
          queryClient.invalidateQueries({ queryKey: ['job-teammates', jobId] });
          if (!silent) {
            toast.success(`Updated ${updatedCount} teammate status${updatedCount > 1 ? 'es' : ''}`);
          }
        } else if (!silent) {
          toast.info('No status updates found');
        }
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
      if (!silent) {
        toast.error('Failed to refresh teammate status');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'error':
        return 'bg-orange-100 text-orange-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const hasCalendarInvites = teammates.some(teammate => teammate.calendar_event_id);

  if (teammates.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No teammates assigned to this job</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assigned Teammates ({teammates.length})
          </CardTitle>
          <CardDescription>
            Team members invited to this job and their response status
          </CardDescription>
          
          {hasCalendarInvites && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRefreshStatus()}
              disabled={isRefreshing}
              className="flex items-center gap-2 mt-3"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Checking...' : 'Refresh Status'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {teammates.map((jobTeammate) => {
            const isRemoving = removingTeammates.has(jobTeammate.id);
            const displayName = jobTeammate.teammate_name || jobTeammate.teammate_email;
            
            return (
              <div
                key={jobTeammate.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(jobTeammate.teammate_name || jobTeammate.teammate_email)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {displayName}
                      </h4>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(jobTeammate.invitation_status)}
                        <Badge className={getStatusColor(jobTeammate.invitation_status)}>
                          {jobTeammate.invitation_status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="break-all">{jobTeammate.teammate_email}</span>
                      </div>
                      
                      {jobTeammate.teammates?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {jobTeammate.teammates.phone}
                        </div>
                      )}
                      
                      {jobTeammate.calendar_event_id && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Calendar invited</span>
                        </div>
                      )}
                    </div>

                    {jobTeammate.teammates?.role && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {jobTeammate.teammates.role}
                      </Badge>
                    )}
                    
                    {jobTeammate.responded_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Responded: {new Date(jobTeammate.responded_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRemoving}
                      className="text-destructive hover:text-destructive"
                    >
                      {isRemoving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Teammate</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove <strong>{displayName}</strong> from this job?
                        {jobTeammate.calendar_event_id && (
                          <span className="block mt-2 text-orange-600">
                            This will also remove them from the calendar event.
                          </span>
                        )}
                        <span className="block mt-2">This action cannot be undone.</span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemoveTeammate(
                          jobTeammate.id,
                          jobTeammate.teammate_name,
                          jobTeammate.teammate_email
                        )}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove Teammate
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
        </div>
        
        {hasCalendarInvites && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <Clock className="h-4 w-4 inline mr-1" />
              Status automatically refreshes every 2 minutes for pending invitations. 
              Use "Refresh Status" to check immediately.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobTeammatesList;
