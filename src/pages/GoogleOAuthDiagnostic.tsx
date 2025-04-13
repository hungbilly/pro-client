
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Copy, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const GoogleOAuthDiagnostic: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the validation edge function
      const response = await supabase.functions.invoke('validate-google-oauth');
      console.log('Google OAuth validation response:', response);
      
      if (response.error) {
        setError(`Error running diagnostics: ${response.error.message || JSON.stringify(response.error)}`);
      } else {
        setDiagnosticData(response.data);
      }
    } catch (err: any) {
      console.error('Error calling validate-google-oauth function:', err);
      setError(`Exception: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const copyToClipboard = (text: any) => {
    navigator.clipboard.writeText(JSON.stringify(text, null, 2));
    toast({
      title: "Copied",
      description: "Diagnostic information copied to clipboard",
    });
  };

  // Default Supabase redirect URI
  const supabaseRedirectUri = `https://htjvyzmuqsrjpesdurni.supabase.co/auth/v1/callback`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'text-green-600';
      case 'missing': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'missing': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Google OAuth Configuration Diagnostics</h1>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={loading} 
          onClick={runDiagnostics}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200">
        <AlertTitle className="text-blue-800">Using Default Supabase Redirect URI</AlertTitle>
        <AlertDescription className="text-blue-700">
          Configuration is set to use the default Supabase redirect URI: <code className="bg-gray-100 px-1">{supabaseRedirectUri}</code>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !diagnosticData && (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Running diagnostics...</p>
        </div>
      )}

      {diagnosticData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {diagnosticData.overallStatus === 'ready' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  Overall Status: {diagnosticData.overallStatus === 'ready' ? 'Ready' : 'Configuration Incomplete'}
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => copyToClipboard(diagnosticData)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy All
                </Button>
              </div>
              <CardDescription>
                Last checked: {new Date(diagnosticData.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client ID Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnosticData.clientId.status)}
                  <h3 className="text-lg font-semibold">Google Client ID</h3>
                </div>
                <div className="pl-7 space-y-1">
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Status:</span> 
                    <span className={getStatusColor(diagnosticData.clientId.status)}>
                      {diagnosticData.clientId.configured ? 'Configured' : 'Not Configured'}
                    </span>
                  </p>
                  {diagnosticData.clientId.configured && (
                    <>
                      <p className="text-sm">
                        <span className="font-medium">Value:</span> {diagnosticData.clientId.value}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Length:</span> {diagnosticData.clientId.length} characters
                      </p>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Client Secret Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnosticData.clientSecret.status)}
                  <h3 className="text-lg font-semibold">Google Client Secret</h3>
                </div>
                <div className="pl-7 space-y-1">
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Status:</span> 
                    <span className={getStatusColor(diagnosticData.clientSecret.status)}>
                      {diagnosticData.clientSecret.configured ? 'Configured' : 'Not Configured'}
                    </span>
                  </p>
                  {diagnosticData.clientSecret.configured && (
                    <p className="text-sm">
                      <span className="font-medium">Length:</span> {diagnosticData.clientSecret.length} characters
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Redirect URI Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnosticData.redirectUri.status)}
                  <h3 className="text-lg font-semibold">Redirect URI</h3>
                </div>
                <div className="pl-7 space-y-1">
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Status:</span> 
                    <span className={getStatusColor(diagnosticData.redirectUri.status)}>
                      Using Default Supabase URI
                    </span>
                  </p>
                  <p className="text-sm break-all">
                    <span className="font-medium">Value:</span> {diagnosticData.redirectUri.value}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Request Information */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Request Information</h3>
                <div className="pl-7 space-y-1">
                  <p className="text-sm break-all">
                    <span className="font-medium">Origin:</span> {diagnosticData.requestInfo.origin || 'N/A'}
                  </p>
                  <p className="text-sm break-all">
                    <span className="font-medium">Referer:</span> {diagnosticData.requestInfo.referer || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {diagnosticData.recommendations && diagnosticData.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Follow these steps to fix the configuration issues</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {diagnosticData.recommendations.map((rec: any, index: number) => (
                    <li key={index} className="bg-gray-50 p-3 rounded-md">
                      <p className={`font-medium ${getPriorityColor(rec.priority)}`}>
                        {rec.priority === 'high' ? '🔴 High Priority: ' : 
                         rec.priority === 'medium' ? '🟠 Medium Priority: ' : '🔵 Low Priority: '}
                        {rec.action}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">{rec.details}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => window.open("https://supabase.com/dashboard/project/htjvyzmuqsrjpesdurni/settings/functions", "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Go to Supabase Secrets Configuration
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleOAuthDiagnostic;
