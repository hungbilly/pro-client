
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Send, 
  Calendar, 
  Users,
  Info
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface RecipientGroup {
  id: string;
  name: string;
  description: string;
  count?: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

const BulkEmailForm = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailMode, setEmailMode] = useState<'template' | 'custom'>('template');
  const [recipientGroups, setRecipientGroups] = useState<RecipientGroup[]>([
    { id: 'all', name: 'All Users', description: 'Send to all registered users' },
    { id: 'trial', name: 'Trial Users', description: 'Users in trial period' },
    { id: 'active', name: 'Active Subscribers', description: 'Users with active paid subscriptions' },
    { id: 'expired', name: 'Expired Trials', description: 'Users whose trial has expired without subscribing' }
  ]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [isScheduled, setIsScheduled] = useState(false);
  
  useEffect(() => {
    fetchTemplates();
    fetchRecipientCounts();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
      
      if (data && data.length > 0) {
        setSelectedTemplate(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching email templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipientCounts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('admin-get-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data && response.data.users) {
        const users = response.data.users;
        const allCount = users.length;
        const trialCount = users.filter(u => u.trialEndDate && new Date(u.trialEndDate) > new Date()).length;
        const activeCount = users.filter(u => u.status === 'active').length;
        const expiredCount = users.filter(u => 
          u.trialEndDate && new Date(u.trialEndDate) <= new Date() && u.status !== 'active'
        ).length;

        setRecipientGroups([
          { id: 'all', name: 'All Users', description: 'Send to all registered users', count: allCount },
          { id: 'trial', name: 'Trial Users', description: 'Users in trial period', count: trialCount },
          { id: 'active', name: 'Active Subscribers', description: 'Users with active paid subscriptions', count: activeCount },
          { id: 'expired', name: 'Expired Trials', description: 'Users whose trial has expired without subscribing', count: expiredCount }
        ]);
      }
    } catch (error) {
      console.error('Error fetching recipient counts:', error);
    }
  };

  const getSelectedTemplate = () => {
    return templates.find(t => t.id === selectedTemplate);
  };

  const handleTemplateChange = (id: string) => {
    setSelectedTemplate(id);
  };

  const handleSendEmail = async () => {
    if (emailMode === 'template' && !selectedTemplate) {
      toast({
        title: 'Error',
        description: 'Please select an email template',
        variant: 'destructive',
      });
      return;
    }

    if (emailMode === 'custom' && (!customSubject || !customBody)) {
      toast({
        title: 'Error',
        description: 'Please enter both subject and body for custom email',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedGroup) {
      toast({
        title: 'Error',
        description: 'Please select a recipient group',
        variant: 'destructive',
      });
      return;
    }

    if (isScheduled && (!scheduledDate || !scheduledTime)) {
      toast({
        title: 'Error',
        description: 'Please select both date and time for scheduled delivery',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSending(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      // Prepare scheduled datetime if needed
      let scheduledFor = null;
      if (isScheduled) {
        scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
        if (isNaN(scheduledFor.getTime())) {
          throw new Error('Invalid scheduled date or time');
        }
      }

      // Send the request to the edge function
      const response = await supabase.functions.invoke('admin-send-bulk-email', {
        body: {
          emailMode,
          templateId: emailMode === 'template' ? selectedTemplate : undefined,
          customSubject: emailMode === 'custom' ? customSubject : undefined,
          customBody: emailMode === 'custom' ? customBody : undefined,
          recipientGroup: selectedGroup,
          scheduledFor: scheduledFor ? scheduledFor.toISOString() : undefined
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send emails');
      }

      toast({
        title: 'Success',
        description: isScheduled ? 'Emails scheduled successfully' : 'Emails are being sent',
      });
      navigate('/admin/email-history');
    } catch (error: any) {
      console.error('Error sending bulk email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send emails',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Send Bulk Email</CardTitle>
        </div>
        <CardDescription>Send emails to multiple users at once</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Email Content</TabsTrigger>
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="space-y-6 pt-4">
            <RadioGroup 
              defaultValue="template" 
              value={emailMode} 
              onValueChange={(value) => setEmailMode(value as 'template' | 'custom')}
              className="mb-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="template" id="template" />
                <Label htmlFor="template">Use Email Template</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Custom Email</Label>
              </div>
            </RadioGroup>
            
            {emailMode === 'template' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template">Email Template</Label>
                  <Select 
                    value={selectedTemplate} 
                    onValueChange={handleTemplateChange}
                    disabled={loading || templates.length === 0}
                  >
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {getSelectedTemplate() && (
                  <div className="p-4 border rounded-md">
                    <h3 className="font-medium mb-2">Template Preview</h3>
                    <div className="p-3 bg-gray-50 rounded mb-2">
                      <p className="text-sm font-semibold">Subject: {getSelectedTemplate()?.subject}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded whitespace-pre-wrap">
                      <p className="text-sm">{getSelectedTemplate()?.body}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customSubject">Email Subject</Label>
                  <Input
                    id="customSubject"
                    placeholder="Enter email subject"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customBody">Email Body</Label>
                  <Textarea
                    id="customBody"
                    placeholder="Enter email body"
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    rows={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can use {'{{'} + "name" + '}}'}, {'{{'} + "email" + '}}'} and other variable placeholders.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recipients" className="space-y-6 pt-4">
            <div className="space-y-4">
              <Label>Select Recipient Group</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipientGroups.map(group => (
                  <div 
                    key={group.id}
                    className={`p-4 border rounded-md cursor-pointer hover:border-primary transition-colors ${
                      selectedGroup === group.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedGroup(group.id)}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium">{group.name}</h3>
                      {group.count !== undefined && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {group.count} users
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox 
                  id="scheduled" 
                  checked={isScheduled}
                  onCheckedChange={(checked) => setIsScheduled(checked === true)}
                />
                <Label htmlFor="scheduled" className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule for later
                </Label>
              </div>
              
              {isScheduled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate">Date</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime">Time</Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Sending bulk emails may take some time. You'll be able to view the status in the email history section.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => navigate('/admin')}
        >
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={handleSendEmail} 
          disabled={sending}
        >
          {sending ? (
            <>Processing...</>
          ) : (
            <>
              {isScheduled ? (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Email
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email Now
                </>
              )}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BulkEmailForm;
