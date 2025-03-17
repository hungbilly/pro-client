
import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';

const formSchema = z.object({
  defaultCurrency: z.string().min(1, { message: 'Currency is required' }),
  invoiceNumberFormat: z.string().min(1, { message: 'Invoice number format is required' }),
  useCustomFormat: z.boolean().default(false),
  customFormat: z.string().optional(),
  invoiceTemplate: z.string().optional(),
  contractTemplate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Define the user settings type to match our database structure
interface UserSettings {
  id: string;
  user_id: string;
  default_currency: string;
  invoice_number_format: string;
  use_custom_format: boolean;
  custom_format: string | null;
  invoice_template: string | null;
  contract_template: string | null;
  created_at: string;
  updated_at: string;
}

// Helper function to validate if the data has UserSettings shape
function isUserSettings(data: any): data is UserSettings {
  return (
    data &&
    typeof data === 'object' &&
    'id' in data &&
    'user_id' in data &&
    'default_currency' in data &&
    'invoice_number_format' in data
  );
}

const AccountSettings = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      defaultCurrency: 'USD',
      invoiceNumberFormat: 'numeric',
      useCustomFormat: false,
      customFormat: '',
      invoiceTemplate: '',
      contractTemplate: '',
    },
  });
  
  const useCustomFormat = form.watch('useCustomFormat');
  const invoiceNumberFormat = form.watch('invoiceNumberFormat');

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Use type assertion to tell TypeScript this is a valid table
      const { data, error } = await supabase
        .from('user_settings' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading settings:', error);
        throw error;
      }

      // If settings exist, populate the form
      if (data && isUserSettings(data)) {
        form.reset({
          defaultCurrency: data.default_currency || 'USD',
          invoiceNumberFormat: data.invoice_number_format || 'numeric',
          useCustomFormat: data.use_custom_format || false,
          customFormat: data.custom_format || '',
          invoiceTemplate: data.invoice_template || '',
          contractTemplate: data.contract_template || '',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load account settings');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Check if settings already exist
      const { data: existingData, error: checkError } = await supabase
        .from('user_settings' as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking settings:', checkError);
        throw checkError;
      }

      const settingsData = {
        user_id: user.id,
        default_currency: values.defaultCurrency,
        invoice_number_format: values.invoiceNumberFormat,
        use_custom_format: values.useCustomFormat,
        custom_format: values.customFormat,
        invoice_template: values.invoiceTemplate,
        contract_template: values.contractTemplate,
      };

      let result;
      // Update or insert based on whether settings exist
      if (existingData && typeof existingData === 'object' && 'id' in existingData && existingData.id) {
        result = await supabase
          .from('user_settings' as any)
          .update(settingsData as any)
          .eq('id', existingData.id);
      } else {
        result = await supabase
          .from('user_settings' as any)
          .insert(settingsData as any);
      }

      if (result.error) throw result.error;
      
      toast.success('Account settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save account settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !form.formState.isDirty) {
    return <div className="text-center p-8">Loading account settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="rounded-lg border p-6">
            <CardContent className="p-0 space-y-6">
              <h2 className="text-xl font-semibold mb-4">Invoice Settings</h2>
              
              <FormField
                control={form.control}
                name="defaultCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Currency</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                        <SelectItem value="AUD">AUD (A$)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This will be the default currency for all new invoices.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="invoiceNumberFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number Format</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="numeric">Numeric (e.g., 0001, 0002)</SelectItem>
                          <SelectItem value="date">Date-based (e.g., 2023-001)</SelectItem>
                          <SelectItem value="custom">Custom Format</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose how invoice numbers should be formatted.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {invoiceNumberFormat === 'custom' && (
                  <FormField
                    control={form.control}
                    name="customFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Format</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g., INV-{YYYY}-{0000}"
                          />
                        </FormControl>
                        <FormDescription>
                          Use {'{YYYY}'} for year, {'{MM}'} for month, {'{DD}'} for day, and {'{0000}'} for sequential number.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border p-6">
            <CardContent className="p-0 space-y-6">
              <h2 className="text-xl font-semibold mb-4">Templates</h2>
              
              <FormField
                control={form.control}
                name="invoiceTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Template</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter your default invoice template text here..."
                        rows={6}
                      />
                    </FormControl>
                    <FormDescription>
                      This template will be used for new invoices. You can use variables like {'{client_name}'}, {'{invoice_number}'}, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contractTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Template</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter your default contract terms here..."
                        rows={8}
                      />
                    </FormControl>
                    <FormDescription>
                      This template will be used for new contracts. You can use variables like {'{client_name}'}, {'{service_description}'}, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isLoading || !form.formState.isDirty}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AccountSettings;
