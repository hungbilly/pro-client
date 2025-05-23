
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, AlertCircle, CheckCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface UserStatusManagerProps {
  userId: string;
  email?: string;
  currentStatus?: string;
  currentTrialEndDate?: string | null;
  onStatusUpdated?: () => void;
}

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "trialing", label: "Trialing" },
  { value: "inactive", label: "Inactive" }
];

const UserStatusManager: React.FC<UserStatusManagerProps> = ({
  userId,
  email,
  currentStatus,
  currentTrialEndDate,
  onStatusUpdated
}) => {
  const { session } = useAuth(); // Get current auth session
  const [status, setStatus] = useState<string>(currentStatus || "");
  const [trialEndDate, setTrialEndDate] = useState<Date | undefined>(
    currentTrialEndDate ? new Date(currentTrialEndDate) : undefined
  );
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [adminOverride, setAdminOverride] = useState<boolean>(true);
  const [hasTrialDateWarning, setHasTrialDateWarning] = useState(false);

  // Check if the trial end date is in the past
  useEffect(() => {
    if (trialEndDate) {
      const now = new Date();
      setHasTrialDateWarning(trialEndDate < now && status === "trialing");
    } else {
      setHasTrialDateWarning(false);
    }
  }, [trialEndDate, status]);

  const handleUpdateStatus = async () => {
    if (!userId || !status) {
      setError("User ID and status are required");
      return;
    }

    if (!session) {
      setError("You must be logged in to perform this action");
      toast.error("Authentication error: No active session");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Format date to ISO string if it exists
      const formattedTrialEndDate = trialEndDate ? trialEndDate.toISOString() : null;
      
      console.log("Updating user status with session token:", 
        session.access_token ? `${session.access_token.substring(0, 10)}...` : "missing");
      
      // Pass the auth token explicitly
      const { data, error } = await supabase.functions.invoke('admin-update-user-status', {
        body: {
          userId,
          status,
          trialEndDate: formattedTrialEndDate,
          notes,
          adminOverride
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Function error:', error);
        throw new Error(`Function error: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('Invalid response data:', data);
        throw new Error('Failed to update user status: Invalid response from server');
      }

      console.log('Status update successful:', data);
      setSuccess(true);
      toast.success(`User ${email || userId} status updated to ${status}`);
      
      if (onStatusUpdated) {
        onStatusUpdated();
      }
      
    } catch (err: any) {
      console.error('Error updating user status:', err);
      setError(err.message || 'An error occurred while updating user status');
      toast.error('Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setStatus(currentStatus || "");
    setTrialEndDate(currentTrialEndDate ? new Date(currentTrialEndDate) : undefined);
    setNotes("");
    setError(null);
    setSuccess(false);
    setAdminOverride(true); // Reset to default value
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Manage Subscription Status</CardTitle>
        <CardDescription>
          Override user subscription status and trial periods
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!userId && (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No user selected</AlertTitle>
            <AlertDescription>
              Please select a user to manage their subscription status.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default" className="mb-4 bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>User subscription status has been updated.</AlertDescription>
          </Alert>
        )}

        {hasTrialDateWarning && (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning: Past Trial Date</AlertTitle>
            <AlertDescription>
              The selected trial end date is in the past. This will immediately set the user's access to inactive, even though the status shows "trialing".
            </AlertDescription>
          </Alert>
        )}

        {!session && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              No active session found. Please log out and log back in to refresh your authentication.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Subscription Status</Label>
            <Select
              value={status}
              onValueChange={setStatus}
              disabled={!userId || loading || !session}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trial-end-date">Trial End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !trialEndDate && "text-muted-foreground"
                  )}
                  disabled={!userId || loading || !session}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {trialEndDate ? format(trialEndDate, "PPP") : "No trial end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={trialEndDate}
                  onSelect={setTrialEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Only needed for trial status. Leave empty for active or inactive status.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="admin-override">Admin Override</Label>
              <Switch 
                id="admin-override"
                checked={adminOverride}
                onCheckedChange={setAdminOverride}
                disabled={!userId || loading || !session}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, this status will persist even when Stripe webhooks are received. When disabled, Stripe can update the subscription status automatically.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Admin Notes</Label>
            <Textarea
              id="notes"
              placeholder="Reason for status change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
              disabled={!userId || loading || !session}
            />
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleUpdateStatus}
              disabled={!userId || !status || loading || !session}
              className="flex-1"
            >
              {loading ? "Updating..." : "Update Status"}
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={!userId || loading}
            >
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserStatusManager;
