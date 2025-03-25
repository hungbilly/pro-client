
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Invoice, InvoiceItem, PaymentSchedule, Client, Company, Job } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, FileText, Mail, Printer, RefreshCw, Download, Globe, Copy, Link, Edit } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import PaymentDateDialog from '@/components/invoice/PaymentDateDialog';
import PaymentScheduleTable from '@/components/invoice/PaymentScheduleTable';

const SUPABASE_URL = "https://htjvyzmuqsrjpesdurni.supabase.co";

const InvoiceView = () => {
  const { idOrViewLink } = useParams<{ idOrViewLink: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGeneratingStatic, setIsGeneratingStatic] = useState(false);
  const [hasStaticVersion, setHasStaticVersion] = useState(false);
  const [isContractAccepted, setIsContractAccepted] = useState(false);

  const isClientView = idOrViewLink && (!idOrViewLink.includes('-') || idOrViewLink.length < 36);

  useEffect(() => {
    const checkAdmin = async () => {
      setIsAdmin(true);
    };
    
    checkAdmin();
  }, []);

  useEffect(() => {
    const fetchInvoice = async () => {
      setIsLoading(true);
      
      try {
        let fetchedInvoice;
        let viewLink;
        
        if (isClientView) {
          viewLink = idOrViewLink;
          const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('view_link', viewLink)
            .single();
          
          if (error) throw error;
          fetchedInvoice = data;
        } else {
          const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', idOrViewLink)
            .single();
          
          if (error) throw error;
          fetchedInvoice = data;
          viewLink = fetchedInvoice.view_link;
        }
        
        const { data: staticCheck } = await supabase
          .from('clientview_invoice')
          .select('id')
          .eq('invoice_id', fetchedInvoice.id)
          .maybeSingle();
        
        setHasStaticVersion(!!staticCheck);
        
        const mappedInvoice: Invoice = {
          id: fetchedInvoice.id,
          clientId: fetchedInvoice.client_id,
          companyId: fetchedInvoice.company_id,
          jobId: fetchedInvoice.job_id,
          number: fetchedInvoice.number,
          amount: fetchedInvoice.amount,
          date: fetchedInvoice.date,
          dueDate: fetchedInvoice.due_date,
          status: fetchedInvoice.status,
          contractStatus: fetchedInvoice.contract_status,
          notes: fetchedInvoice.notes,
          contractTerms: fetchedInvoice.contract_terms,
          viewLink: fetchedInvoice.view_link,
          items: [],
          shootingDate: fetchedInvoice.shooting_date,
          pdfUrl: fetchedInvoice.pdf_url
        };
        
        setIsContractAccepted(fetchedInvoice.contract_status === 'accepted');
        
        const { data: items, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', fetchedInvoice.id);
        
        if (itemsError) throw itemsError;
        
        mappedInvoice.items = items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        }));
        
        const { data: schedules, error: schedulesError } = await supabase
          .from('payment_schedules')
          .select('*')
          .eq('invoice_id', fetchedInvoice.id)
          .order('due_date', { ascending: true });
        
        if (!schedulesError && schedules && schedules.length > 0) {
          mappedInvoice.paymentSchedules = schedules.map(schedule => ({
            id: schedule.id,
            description: schedule.description || '',
            dueDate: schedule.due_date,
            percentage: schedule.percentage,
            status: schedule.status as PaymentSchedule['status'],
            paymentDate: schedule.payment_date
          }));
        }
        
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', fetchedInvoice.client_id)
          .single();
        
        if (clientError) throw clientError;
        
        setClient({
          id: clientData.id,
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          createdAt: clientData.created_at,
          notes: clientData.notes
        });
        
        if (fetchedInvoice.company_id) {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', fetchedInvoice.company_id)
            .single();
          
          if (!companyError && companyData) {
            console.info('[InvoiceView] Fetched company data for client view:', companyData);
            setCompany(companyData as Company);
          }
        }
        
        if (fetchedInvoice.job_id) {
          const { data: jobData, error: jobError } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', fetchedInvoice.job_id)
            .single();
          
          if (!jobError && jobData) {
            setJob({
              id: jobData.id,
              clientId: jobData.client_id,
              companyId: jobData.company_id,
              title: jobData.title,
              description: jobData.description || '',
              status: jobData.status as "active" | "completed" | "cancelled",
              date: jobData.date,
              location: jobData.location,
              startTime: jobData.start_time,
              endTime: jobData.end_time,
              isFullDay: jobData.is_full_day,
              createdAt: jobData.created_at,
              updatedAt: jobData.updated_at
            });
          }
        }
        
        if (fetchedInvoice.contract_terms) {
          console.info('[InvoiceView] Fetched invoice with contract terms:', {
            id: fetchedInvoice.id,
            hasContractTerms: !!fetchedInvoice.contract_terms,
            contractTermsLength: fetchedInvoice.contract_terms?.length,
            contractStatus: fetchedInvoice.contract_status,
            contractTermsPreview: fetchedInvoice.contract_terms?.substring(0, 100)
          });
          
          console.info('[InvoiceView] Current invoice contract terms:', {
            hasContractTerms: !!mappedInvoice.contractTerms,
            contractTermsLength: mappedInvoice.contractTerms?.length,
            contractStatus: mappedInvoice.contractStatus,
            contractPreview: mappedInvoice.contractTerms?.substring(0, 100)
          });
        }
        
        setInvoice(mappedInvoice);
      } catch (error) {
        console.error('Error fetching invoice:', error);
        toast.error('Failed to load invoice data.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (idOrViewLink) {
      fetchInvoice();
    }
  }, [idOrViewLink, isClientView]);

  // ... rest of the component remains unchanged
};

// Add the missing default export here
export default InvoiceView;
