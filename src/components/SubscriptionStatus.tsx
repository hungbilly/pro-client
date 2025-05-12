import React, { useState } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, AlertCircle, Loader2, RefreshCw, Bug, CalendarX } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
export const SubscriptionStatusBadge = () => {
  const {
    hasAccess,
    isLoading,
    isInTrialPeriod,
    subscription
  } = useSubscription();
  if (isLoading) {
    return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
        Loading...
      </span>;
  }
  if (subscription && subscription.status === 'active') {
    return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800">
        Active
      </span>;
  }
  if (isInTrialPeriod && (!subscription || subscription.status !== 'active')) {
    return <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
        Trial
      </span>;
  }
  if (!hasAccess) {
    return <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-800">
        Expired
      </span>;
  }
  return null;
};
const SubscriptionStatus = () => {
  const {
    hasAccess,
    isLoading,
    isInTrialPeriod,
    trialDaysLeft,
    trialEndDate,
    subscription,
    checkSubscription
  } = useSubscription();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [isLoadingDebug, setIsLoadingDebug] = useState(false);
  console.log("SubscriptionStatus render state:", {
    hasAccess,
    isLoading,
    isInTrialPeriod,
    trialDaysLeft,
    trialEndDate,
    subscription
  });
  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await checkSubscription();
      toast.success("Subscription status refreshed");
    } catch (error) {
      toast.error("Failed to refresh subscription status");
      console.error("Error refreshing subscription:", error);
    } finally {
      setIsRefreshing(false);
    }
  };
  const handleShowDebug = async () => {
    setIsLoadingDebug(true);
    try {
      const {
        data,
        error
      } = await supabase.from('user_subscriptions').select('*');
      if (error) {
        throw error;
      }
      setDebugData(data);
      setShowDebug(true);
      console.log('Debug subscription data:', data);
    } catch (error) {
      console.error('Error fetching subscription debug data:', error);
      toast.error('Failed to fetch subscription debug data');
    } finally {
      setIsLoadingDebug(false);
    }
  };
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMMM d, yyyy');
  };
  const isPendingCancellation = subscription?.status === 'active' && subscription?.cancel_at;
  if (isLoading) {
    return <Card className="w-full">
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Loading your subscription details...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Subscription Status</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShowDebug} disabled={isLoadingDebug} className="h-8 px-2">
              <Bug className={`h-4 w-4 mr-1 ${isLoadingDebug ? 'animate-pulse' : ''}`} />
              Debug
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRefreshStatus} disabled={isRefreshing} className="h-8 w-8 p-0">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </CardTitle>
        <CardDescription>Manage your subscription plan</CardDescription>
      </CardHeader>
      <CardContent>
        {subscription && subscription.status === 'active' ? <div className="p-4 border rounded-lg bg-green-50 border-green-200">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-green-800">
                  Active Subscription - Premium Plan
                </h3>
                <p className="text-sm text-green-700">
                  Status: {subscription.status}
                </p>

                {isPendingCancellation ? <div className="mt-2 flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                    <CalendarX className="h-4 w-4" />
                    <p className="text-sm">
                      Your subscription will end on {formatDate(subscription.cancel_at)}
                    </p>
                  </div> : <p className="text-sm text-green-700 mt-1">
                    Next billing date: {formatDate(subscription.currentPeriodEnd)}
                  </p>}
                
                <p className="text-sm text-green-700 mt-1">Price: USD$7/month</p>
              </div>
            </div>
          </div> : isInTrialPeriod && (!subscription || subscription.status !== 'active') ? <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Trial Period</h3>
                <p className="text-sm text-amber-700">
                  You are currently in your free trial period. 
                  <span className="font-medium">{trialDaysLeft} days remaining.</span>
                </p>
                {trialEndDate && <p className="text-sm text-amber-700 mt-1">
                    Trial ends on {formatDate(trialEndDate)}
                  </p>}
              </div>
            </div>
          </div> : <div className="p-4 border rounded-lg bg-red-50 border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">No Active Subscription</h3>
                <p className="text-sm text-red-700">
                  You don't have an active subscription. Subscribe to access all premium features.
                </p>
              </div>
            </div>
          </div>}

        {showDebug && debugData && <div className="mt-4 border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-800 flex items-center">
                <Bug className="h-4 w-4 mr-1" /> Raw Subscription Data
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowDebug(false)} className="h-6 px-2 text-xs">
                Hide
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debugData.map((sub: any, index: number) => <React.Fragment key={sub.id || index}>
                      <TableRow className="bg-blue-50 font-medium">
                        <TableCell colSpan={2}>Record #{index + 1}</TableCell>
                      </TableRow>
                      {Object.entries(sub).map(([key, value]: [string, any]) => <TableRow key={key}>
                          <TableCell className="font-mono text-xs">{key}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </TableCell>
                        </TableRow>)}
                    </React.Fragment>)}
                </TableBody>
              </Table>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              {debugData.length === 0 && <p>No subscription records found in the database.</p>}
              <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                ContextSubscription: {JSON.stringify({
              hasAccess,
              isInTrialPeriod,
              trialDaysLeft,
              subscription
            }, null, 2)}
              </pre>
            </div>
          </div>}
      </CardContent>
      <CardFooter>
        <div className="w-full flex gap-4 flex-wrap">
          {!subscription && !isInTrialPeriod && <Button onClick={() => navigate('/subscription')} className="flex-1">
              Subscribe Now
            </Button>}
          {isInTrialPeriod && (!subscription || subscription.status !== 'active') && <Button onClick={() => navigate('/subscription')} variant="outline" className="flex-1">
              Upgrade to Premium
            </Button>}
          <Button onClick={handleRefreshStatus} variant="outline" className="flex-1" disabled={isRefreshing}>
            {isRefreshing ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </> : 'Refresh Status'}
          </Button>
        </div>
      </CardFooter>
    </Card>;
};
export default SubscriptionStatus;