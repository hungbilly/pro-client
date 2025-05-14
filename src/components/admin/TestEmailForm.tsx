
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const TestEmailForm = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const templateName = location.state?.templateName || '';

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewBody, setPreviewBody] = useState('');
  const [variablesText, setVariablesText] = useState('');
  const [parsedVariables, setParsedVariables] = useState<Record<string, any>>({});
  const [variablesError, setVariablesError] = useState('');

  useEffect(() => {
    if (id) {
      fetchTemplateDetails();
    }
  }, [id]);

  const fetchTemplateDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setTemplate(data);
        setPreviewSubject(data.subject);
        setPreviewBody(data.body);
        
        // Extract variables from template
        const subjectVars = extractVariables(data.subject);
        const bodyVars = extractVariables(data.body);
        const allVars = [...new Set([...subjectVars, ...bodyVars])];
        
        // Create a JSON object with the variables
        if (allVars.length > 0) {
          const varsObj = allVars.reduce((acc, v) => {
            acc[v] = `[${v} value]`;
            return acc;
          }, {});
          setVariablesText(JSON.stringify(varsObj, null, 2));
          updateParsedVariables(JSON.stringify(varsObj));
        }
      }
    } catch (error) {
      console.error('Error fetching template details:', error);
      toast.error('Failed to load template details');
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
    return matches.map(match => match.replace(/\{\{|\}\}/g, '').trim());
  };

  const updateParsedVariables = (jsonText: string) => {
    try {
      setVariablesError('');
      if (!jsonText.trim()) {
        setParsedVariables({});
        return;
      }
      
      const parsed = JSON.parse(jsonText);
      setParsedVariables(parsed);
      
      // Update preview
      if (template) {
        setPreviewSubject(replaceVariables(template.subject, parsed));
        setPreviewBody(replaceVariables(template.body, parsed));
      }
    } catch (error) {
      setVariablesError('Invalid JSON format');
    }
  };

  const replaceVariables = (text: string, variables: Record<string, any>): string => {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      return variables[trimmedKey] !== undefined 
        ? String(variables[trimmedKey]) 
        : match;
    });
  };

  const handleVariablesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVariablesText(e.target.value);
    updateParsedVariables(e.target.value);
  };

  const handleSendTest = async () => {
    if (!recipientEmail) {
      toast.error('Please enter a recipient email');
      return;
    }

    try {
      setSending(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('send-system-email', {
        body: {
          templateId: id,
          recipientEmail: recipientEmail,
          variables: parsedVariables
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send test email');
      }

      toast.success('Test email sent successfully');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Template...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Template Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              The requested email template could not be found.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button 
            variant="default"
            onClick={() => navigate('/admin/email-templates')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2"
            onClick={() => navigate('/admin/email-templates')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Test Email Template: {templateName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="recipientEmail">Recipient Email</Label>
          <Input
            id="recipientEmail"
            placeholder="test@example.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Enter the email address where you want to send the test email.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="variables">Template Variables (JSON)</Label>
          <Textarea
            id="variables"
            value={variablesText}
            onChange={handleVariablesChange}
            rows={6}
            className="font-mono"
            placeholder='{ "name": "John", "company": "Acme Inc." }'
          />
          {variablesError && (
            <p className="text-xs text-red-500">{variablesError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Enter variables as a JSON object. These will be used to replace placeholders in the template.
          </p>
        </div>

        <div className="p-4 border rounded-md">
          <h3 className="font-medium mb-2">Email Preview</h3>
          <div className="p-3 bg-gray-50 rounded mb-2">
            <p className="text-sm font-semibold">Subject: {previewSubject}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded whitespace-pre-wrap">
            <p className="text-sm">{previewBody}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => navigate('/admin/email-templates')}
        >
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={handleSendTest} 
          disabled={sending || !recipientEmail}
        >
          {sending ? (
            <>Sending...</>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Test Email
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TestEmailForm;
