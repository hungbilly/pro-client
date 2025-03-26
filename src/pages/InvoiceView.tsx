
import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { 
  getInvoiceByViewLink, 
  getClient, 
  updateInvoiceStatus, 
  getInvoice, 
  updateContractStatus,
  updatePaymentScheduleStatus,
  getJob
} from '@/lib/storage';
import { Invoice, Client, Job, CompanyClientView } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Calendar, FileText, DollarSign, Send, MailCheck, FileCheck, Edit, CalendarDays, Package, Building, User, Phone, Mail, MapPin, Download, Copy, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useAuth } from '@/context/AuthContext';
import { useCompanyContext } from '@/context/CompanyContext';
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from '@/components/RichTextEditor';
import PaymentScheduleTable from '@/components/invoice/PaymentScheduleTable';
import isEqual from 'lodash/isEqual';
import html2pdf from 'html2pdf.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const InvoiceView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const { isAdmin } = useAuth();
  const { selectedCompanyId, selectedCompany } = useCompanyContext();
  const { idOrViewLink } = useParams<{ idOrViewLink: string }>();
  const location = useLocation();

  const isClientView = useMemo(() => 
    !location.pathname.includes('/admin') && !isAdmin, 
    [location.pathname, isAdmin]
  );

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  const [clientViewCompany, setClientViewCompany] = useState<CompanyClientView | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        let fetchedInvoice: Invoice | null = null;
        
        const identifier = idOrViewLink;
        if (!identifier) {
          console.log('[InvoiceView] No identifier provided in URL');
          setError('Invalid URL. Please provide an invoice ID or view link.');
          return;
        }
        
        console.log('[InvoiceView] Fetching invoice with identifier:', identifier);
        
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        
        if (isUUID) {
          console.log('[InvoiceView] Identifier looks like a UUID, using getInvoice');
          fetchedInvoice = await getInvoice(identifier);
        } else {
          console.log('[InvoiceView] Identifier does not look like a UUID, using getInvoiceByViewLink');
          fetchedInvoice = await getInvoiceByViewLink(identifier);
        }
        
        if (!fetchedInvoice) {
          const urlPath = location.pathname;
          const lastPartOfUrl = urlPath.split('/').pop() || '';
          
          if (lastPartOfUrl && lastPartOfUrl !== identifier) {
            console.log('[InvoiceView] Trying alternative identifier from URL path:', lastPartOfUrl);
            
            const isLastPartUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastPartOfUrl);
            
            if (isLastPartUUID) {
              fetchedInvoice = await getInvoice(lastPartOfUrl);
            } else {
              fetchedInvoice = await getInvoiceByViewLink(lastPartOfUrl);
            }
          }
        }
        
        if (!fetchedInvoice) {
          console.log('[InvoiceView] No invoice found for identifier:', identifier);
          setError('Invoice not found. Please check the URL or contact support.');
          return;
        }
        
        console.log('[InvoiceView] Fetched invoice with contract terms:', {
          id: fetchedInvoice.id,
          hasContractTerms: !!fetchedInvoice.contractTerms,
          contractTermsLength: fetchedInvoice.contractTerms?.length || 0,
          contractStatus: fetchedInvoice.contractStatus,
          contractTermsPreview: fetchedInvoice.contractTerms?.substring(0, 100)
        });
        
        if (selectedCompanyId && fetchedInvoice.companyId !== selectedCompanyId && !isClientView) {
          console.log('[InvoiceView] Invoice company mismatch. Expected:', selectedCompanyId, 'Got:', fetchedInvoice.companyId);
          toast.error("This invoice belongs to a different company");
          setError('This invoice belongs to a different company.');
          return;
        }
        
        setInvoice(fetchedInvoice);
        
        if (fetchedInvoice.clientId) {
          const fetchedClient = await getClient(fetchedInvoice.clientId);
          if (!fetchedClient) {
            console.log('[InvoiceView] No client found for clientId:', fetchedInvoice.clientId);
            setError('Client information not found.');
            return;
          }
          
          setClient(fetchedClient);
        }

        if (fetchedInvoice.jobId) {
          const fetchedJob = await getJob(fetchedInvoice.jobId);
          if (fetchedJob) {
            setJob(fetchedJob);
          }
        }
        
        if (isClientView && fetchedInvoice.companyId) {
          try {
            console.log('[InvoiceView] Client view - fetching company info from company_clientview for:', fetchedInvoice.companyId);
            const { data: companyData, error: companyError } = await supabase
              .from('company_clientview')
              .select('*')
              .eq('company_id', fetchedInvoice.companyId)
              .single();
            
            if (companyError) {
              console.error('[InvoiceView] Error fetching company from clientview:', companyError);
            } else if (companyData) {
              console.log('[InvoiceView] Fetched company data for client view:', companyData);
              setClientViewCompany(companyData as CompanyClientView);
            }
          } catch (err) {
            console.error('[InvoiceView] Failed to fetch company data:', err);
          }
        }
      } catch (err) {
        console.error('[InvoiceView] Failed to load invoice:', err);
        setError('Failed to load invoice. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoice();
  }, [idOrViewLink, location.pathname, selectedCompanyId, isClientView]);

  const handlePaymentStatusUpdate = useCallback(async (paymentId: string, newStatus: 'paid' | 'unpaid' | 'write-off') => {
    if (!invoice || !paymentId) return;
    
    setUpdatingPaymentId(paymentId);
    try {
      let updatedSchedule;
      if (newStatus === 'paid') {
        const today = new Date();
        const formattedDate = format(today, 'yyyy-MM-dd');
        updatedSchedule = await updatePaymentScheduleStatus(paymentId, newStatus, formattedDate);
      } else {
        updatedSchedule = await updatePaymentScheduleStatus(paymentId, newStatus);
      }
      
      if (!updatedSchedule) {
        toast.error('Failed to update payment status');
        return;
      }
      
      if (invoice.paymentSchedules) {
        const updatedSchedules = invoice.paymentSchedules.map(schedule => 
          schedule.id === paymentId ? updatedSchedule : schedule
        );
        
        setInvoice(prev => {
          if (!prev) return prev;
          if (isEqual(prev.paymentSchedules, updatedSchedules)) {
            return prev;
          }
          return {
            ...prev,
            paymentSchedules: updatedSchedules
          };
        });
      }
    } catch (err) {
      console.error('Failed to update payment status:', err);
      toast.error('Error updating payment status');
    } finally {
      setUpdatingPaymentId(null);
    }
  }, [invoice]);

  const handlePaymentDateUpdate = useCallback(async (paymentId: string, paymentDate: string) => {
    if (!invoice || !paymentId) return;
    
    setUpdatingPaymentId(paymentId);
    try {
      const updatedSchedule = await updatePaymentScheduleStatus(
        paymentId, 
        'paid',
        paymentDate
      );
      
      if (!updatedSchedule) {
        toast.error('Failed to update payment date');
        return;
      }
      
      if (invoice.paymentSchedules) {
        const updatedSchedules = invoice.paymentSchedules.map(schedule => 
          schedule.id === paymentId ? updatedSchedule : schedule
        );
        
        setInvoice(prev => {
          if (!prev) return prev;
          if (isEqual(prev.paymentSchedules, updatedSchedules)) {
            return prev;
          }
          return {
            ...prev,
            paymentSchedules: updatedSchedules
          };
        });
      }
    } catch (err) {
      console.error('Failed to update payment date:', err);
      toast.error('Error updating payment date');
    } finally {
      setUpdatingPaymentId(null);
    }
  }, [invoice]);

  const handleCopyInvoiceLink = () => {
    if (!invoice) return;
    
    const baseUrl = window.location.origin;
    
    let cleanViewLink = invoice.viewLink;
    if (cleanViewLink.includes('http') || cleanViewLink.includes('/invoice/')) {
      const parts = cleanViewLink.split('/');
      cleanViewLink = parts[parts.length - 1];
    }
    
    const cleanUrl = `${baseUrl}/invoice/${cleanViewLink}`;
    
    console.log('Copying invoice link:', cleanUrl);
    
    navigator.clipboard.writeText(cleanUrl)
      .then(() => {
        toast.success('Invoice link copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy invoice link:', err);
        toast.error('Failed to copy link to clipboard');
      });
  };

  const generateCustomPdf = useCallback(async () => {
    if (!invoice || !client) {
      toast.error('Cannot generate PDF: Missing invoice or client data');
      return;
    }

    try {
      setGeneratingPdf(true);
      toast.info('Generating custom PDF...');

      // Fetch data from Supabase function to get all necessary information
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId: invoice.id }
      });

      if (error) {
        console.error('Error invoking Supabase function:', error);
        toast.error('Failed to prepare PDF data');
        setGeneratingPdf(false);
        return;
      }

      const invoiceData = data?.invoiceData;
      if (!invoiceData) {
        toast.error('Failed to prepare PDF data');
        setGeneratingPdf(false);
        return;
      }

      console.log('PDF data received:', invoiceData);

      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Document constants
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Get company data
      const company = invoiceData.company || clientViewCompany;
      let currentY = margin;
      
      // Header - Company logo and information
      if (company) {
        // Try to add company logo if available
        if (company.logo_url) {
          try {
            // We'll use a placeholder position for the logo, actual image loading would require more complex setup
            doc.setFontSize(10);
            doc.text('[Company Logo]', margin, currentY + 10);
            currentY += 20;
          } catch (logoErr) {
            console.error('Error adding logo to PDF:', logoErr);
          }
        }
        
        // Company details on the right
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(company.name, pageWidth - margin - doc.getTextWidth(company.name), currentY);
        currentY += 7;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        if (company.email) {
          doc.text(company.email, pageWidth - margin - doc.getTextWidth(company.email), currentY);
          currentY += 5;
        }
        
        if (company.phone) {
          doc.text(company.phone, pageWidth - margin - doc.getTextWidth(company.phone), currentY);
          currentY += 5;
        }
        
        if (company.address) {
          const addressLines = company.address.split('\n');
          addressLines.forEach(line => {
            doc.text(line, pageWidth - margin - doc.getTextWidth(line), currentY);
            currentY += 5;
          });
        }
      }
      
      currentY = Math.max(currentY, margin + 30); // Ensure minimum space after header
      
      // Invoice title and number
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', margin, currentY);
      currentY += 8;
      
      doc.setFontSize(14);
      doc.text(`# ${invoice.number}`, margin, currentY);
      currentY += 10;
      
      // Invoice details and client information in two columns
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Left column - Invoice details
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(invoice.date).toLocaleDateString(), margin + 25, currentY);
      currentY += 5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Due Date:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(invoice.dueDate).toLocaleDateString(), margin + 25, currentY);
      currentY += 5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Status:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.status.toUpperCase(), margin + 25, currentY);
      
      // Right column - Client information
      const clientStartY = currentY - 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Client:', pageWidth / 2, clientStartY);
      doc.setFont('helvetica', 'normal');
      doc.text(client.name, pageWidth / 2 + 25, clientStartY);
      
      if (client.email) {
        doc.text(client.email, pageWidth / 2 + 25, clientStartY + 5);
      }
      
      if (client.phone) {
        doc.text(client.phone, pageWidth / 2 + 25, clientStartY + 10);
      }
      
      if (client.address) {
        const addressLines = client.address.split('\n');
        addressLines.forEach((line, i) => {
          doc.text(line, pageWidth / 2 + 25, clientStartY + 15 + (i * 5));
        });
      }
      
      currentY += 20; // Space after client/invoice info
      
      // If we have a job, add job information
      if (job) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Job Details:', margin, currentY);
        currentY += 6;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Title: ${job.title}`, margin + 5, currentY);
        currentY += 5;
        
        if (job.date) {
          doc.text(`Date: ${job.date}`, margin + 5, currentY);
          currentY += 5;
        }
        
        if (job.location) {
          doc.text(`Location: ${job.location}`, margin + 5, currentY);
          currentY += 5;
        }
        
        currentY += 5; // Space after job details
      }
      
      // Separator line
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
      
      // Invoice Items section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Items', margin, currentY);
      currentY += 8;
      
      const items = invoiceData.items || invoice.items || [];
      
      if (items && items.length > 0) {
        const columns = ['Item', 'Description', 'Quantity', 'Rate', 'Amount'];
        
        const rows = items.map(item => [
          item.name || 'Unnamed Item',
          item.description || '',
          item.quantity.toString(),
          formatCurrency(item.rate),
          formatCurrency(item.amount)
        ]);
        
        // @ts-ignore - jspdf-autotable typings
        doc.autoTable({
          head: [columns],
          body: rows,
          startY: currentY,
          margin: { left: margin, right: margin },
          styles: { overflow: 'linebreak', cellWidth: 'auto' },
          columnStyles: {
            0: { cellWidth: 40 }, // Item name
            1: { cellWidth: 'auto' }, // Description (can wrap)
            2: { cellWidth: 20, halign: 'center' }, // Quantity
            3: { cellWidth: 30, halign: 'right' }, // Rate
            4: { cellWidth: 30, halign: 'right' } // Amount
          },
          didDrawPage: (data) => {
            // Add footer with page numbers on each page
            // Fixed: Using internal.getNumberOfPages() instead of getNumberOfPages()
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
              doc.setPage(i);
              const str = `Page ${i} of ${pageCount}`;
              doc.setFontSize(10);
              doc.text(str, pageWidth - margin - doc.getTextWidth(str), pageHeight - 10);
              
              // Add company name in footer
              if (company) {
                doc.text(company.name, margin, pageHeight - 10);
              }
            }
          }
        });
        
        // Update currentY to after the table
        // @ts-ignore - jspdf-autotable typings
        currentY = doc.lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(10);
        doc.text('No items in this invoice.', margin, currentY);
        currentY += 10;
      }
      
      // Invoice Total
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL:', pageWidth - margin - 60, currentY);
      doc.text(formatCurrency(invoice.amount), pageWidth - margin - doc.getTextWidth(formatCurrency(invoice.amount)), currentY);
      currentY += 15;
      
      // Payment Schedule
      const paymentSchedules = invoiceData.paymentSchedules || invoice.paymentSchedules || [];
      
      if (paymentSchedules && paymentSchedules.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Schedule', margin, currentY);
        currentY += 8;
        
        const scheduleColumns = ['Description', 'Due Date', 'Percentage', 'Amount', 'Status', 'Payment Date'];
        
        const scheduleRows = paymentSchedules.map(schedule => [
          schedule.description || '',
          new Date(schedule.dueDate).toLocaleDateString(),
          `${schedule.percentage}%`,
          formatCurrency((invoice.amount * schedule.percentage) / 100),
          schedule.status.toUpperCase(),
          schedule.paymentDate ? new Date(schedule.paymentDate).toLocaleDateString() : '-'
        ]);
        
        // @ts-ignore - jspdf-autotable typings
        doc.autoTable({
          head: [scheduleColumns],
          body: scheduleRows,
          startY: currentY,
          margin: { left: margin, right: margin },
          styles: { overflow: 'linebreak' },
          columnStyles: {
            0: { cellWidth: 'auto' }, // Description
            1: { cellWidth: 30 }, // Due Date
            2: { cellWidth: 25, halign: 'center' }, // Percentage
            3: { cellWidth: 30, halign: 'right' }, // Amount
            4: { cellWidth: 25, halign: 'center' }, // Status
            5: { cellWidth: 30 } // Payment Date
          }
        });
        
        // @ts-ignore - jspdf-autotable typings
        currentY = doc.lastAutoTable.finalY + 10;
      }
      
      // Notes section if available
      if (invoice.notes) {
        // Check if we need to add a page break
        if (currentY > pageHeight - 60) {
          doc.addPage();
          currentY = margin;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Notes', margin, currentY);
        currentY += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // This is a simplification - proper HTML parsing would be more complex
        const notesText = invoice.notes.replace(/<[^>]*>/g, '');
        const textLines = doc.splitTextToSize(notesText, contentWidth);
        doc.text(textLines, margin, currentY);
        currentY += textLines.length * 5 + 10;
      }
      
      // Contract Terms on a new page if they exist
      if (invoice.contractTerms) {
        doc.addPage();
        currentY = margin;
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('CONTRACT TERMS', margin, currentY);
        currentY += 10;
        
        if (invoice.contractStatus === 'accepted') {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 128, 0);
          doc.text('Contract Accepted', margin, currentY);
          doc.setTextColor(0, 0, 0);
          currentY += 8;
        }
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Strip HTML tags for simplicity
        const contractText = invoice.contractTerms.replace(/<[^>]*>/g, '');
        const contractLines = doc.splitTextToSize(contractText, contentWidth);
        
        // Check if we need multiple pages for the contract
        let remainingLines = [...contractLines];
        
        while (remainingLines.length > 0) {
          const maxLinesPerPage = Math.floor((pageHeight - currentY - margin) / 5);
          const linesToAdd = remainingLines.slice(0, maxLinesPerPage);
          remainingLines = remainingLines.slice(maxLinesPerPage);
          
          doc.text(linesToAdd, margin, currentY);
          
          if (remainingLines.length > 0) {
            doc.addPage();
            currentY = margin;
          }
        }
      }
      
      // Save the PDF
      doc.save(`invoice-${invoice.number}.pdf`);
      toast.success('Custom PDF generated successfully');
    } catch (err) {
      console.error('Error generating custom PDF:', err);
      toast.error('Failed to generate custom PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }, [invoice, client, clientViewCompany, job, formatCurrency]);

  const generateClientSidePdf = useCallback(() => {
    if (!invoiceRef.current) {
      toast.error('Unable to generate PDF: Invoice content not found');
      return;
    }

    const element = invoiceRef.current;
    const originalDisplay = element.style.display;
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `invoice-${invoice?.number || 'download'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        width: 794, // A4 width in pixels at 96 DPI (210mm)
        scrollY: 0,
        windowWidth: 794,
        logging: true,
      },
      jsPDF: { 
        unit: 'px', 
        format: [794, 1123], // A4 dimensions in pixels at 96 DPI
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['.invoice-item', '.payment-schedule-table'] },
    };

    // Show both tab contents for the PDF
    const tabsContent = element.querySelectorAll('[data-testid="invoice-tab"], [data-testid="contract-tab"]');
    tabsContent.forEach((content, index) => {
      (content as HTMLElement).style.setProperty('display', 'block', 'important');
      // Add a page break before the Contract Terms tab (second tab, index 1)
      if (index === 1) {
        (content as HTMLElement).style.setProperty('page-break-before', 'always', 'important');
      }
    });

    // Hide the TabsList
    const tabsList = element.querySelector('[data-testid="tabs-list"]');
    if (tabsList) {
      (tabsList as HTMLElement).style.setProperty('display', 'none', 'important');
    } else {
      console.warn('TabsList not found with selector [data-testid="tabs-list"]');
    }

    const originalStyles: Record<string, string> = {};
    const elementsToHide = element.querySelectorAll('button, a.button, .no-print');
    
    elementsToHide.forEach((el, i) => {
      const element = el as HTMLElement;
      originalStyles[i] = element.style.display;
      element.style.setProperty('display', 'none', 'important');
    });

    console.log('Contract tab content:', element.querySelector('[data-testid="contract-tab"]')?.innerHTML.substring(0, 100));
    console.log('Invoice has contract terms:', !!invoice?.contractTerms);
    console.log('Contract terms length:', invoice?.contractTerms?.length);

    // Ensure images are loaded
    const images = element.querySelectorAll('img');
    const imagePromises = Array.from(images).map((img: HTMLImageElement) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });

    // Wait for RichTextEditor content to render
    const waitForRichText = new Promise((resolve) => {
      const checkRichText = () => {
        const richTextEditors = element.querySelectorAll('.rich-text-editor');
        if (richTextEditors.length > 0 && Array.from(richTextEditors).every((editor) => editor.innerHTML.trim() !== '')) {
          resolve(true);
        } else {
          setTimeout(checkRichText, 100); // Check every 100ms
        }
      };
      checkRichText();
    });

    toast.info('Preparing PDF, please wait...');

    Promise.all([...imagePromises, waitForRichText])
      .then(() => {
        html2pdf()
          .set(opt)
          .from(element)
          .save()
          .then(() => {
            toast.success('Invoice PDF generated successfully');
            
            elementsToHide.forEach((el, i) => {
              const element = el as HTMLElement;
              element.style.display = originalStyles[i] || '';
            });

            tabsContent.forEach((content) => {
              (content as HTMLElement).style.display = '';
            });

            if (tabsList) {
              (tabsList as HTMLElement).style.display = '';
            }
          })
          .catch((err: any) => {
            console.error('Error generating PDF:', err);
            toast.error('Failed to generate PDF');
            
            elementsToHide.forEach((el, i) => {
              const element = el as HTMLElement;
              element.style.display = originalStyles[i] || '';
            });

            tabsContent.forEach((content) => {
              (content as HTMLElement).style.display = '';
            });

            if (tabsList) {
              (tabsList as HTMLElement).style.display = '';
            }
          });
      })
      .catch((err) => {
        console.error('Error loading content for PDF:', err);
        toast.error('Failed to load content for PDF generation');
        
        elementsToHide.forEach((el, i) => {
          const element = el as HTMLElement;
          element.style.display = originalStyles[i] || '';
        });

        tabsContent.forEach((content) => {
          (content as HTMLElement).style.display = '';
        });

        if (tabsList) {
          (tabsList as HTMLElement).style.display = '';
        }
      });
  }, [invoice, invoiceRef]);

  const handleDownloadInvoice = useCallback(async () => {
    if (invoice?.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank');
      return;
    }
    
    if (!invoiceRef.current) {
      toast.error('Unable to generate PDF: Invoice content not found');
      return;
    }

    try {
      setGeneratingPdf(true);
      toast.info('Preparing PDF for download...');
      
      // Use our custom PDF generation method
      await generateCustomPdf();
    } catch (err) {
      console.error('Error downloading invoice:', err);
      toast.error('Error generating PDF, falling back to HTML method');
      generateClientSidePdf();
    } finally {
      setGeneratingPdf(false);
    }
  }, [invoice, invoiceRef, generateCustomPdf, generateClientSidePdf]);

  const handleAcceptInvoice = async () => {
    if (!invoice) return;
    
    try {
      await updateInvoiceStatus(invoice.id, 'accepted');
      toast.success('Invoice accepted successfully');
      setInvoice(prev => prev ? { ...prev, status: 'accepted' } : null);
    } catch (err) {
      console.error('Failed to accept invoice:', err);
      toast.error('Error accepting invoice');
    }
  };

  const handleAcceptContract = async () => {
    if (!invoice) return;
    
    try {
      await updateContractStatus(invoice.id, 'accepted');
      toast.success('Contract terms accepted successfully');
      setInvoice(prev => prev ? { ...prev, contractStatus: 'accepted' } : null);
    } catch (err) {
      console.error('Failed to accept contract:', err);
      toast.error('Error accepting contract terms');
    }
  };

  const getDisplayCompany = () => {
    if (isClientView) {
      return clientViewCompany ? {
        id: clientViewCompany.id,
        name: clientViewCompany.name,
        logo_url: clientViewCompany.logo_url,
        email: clientViewCompany.email,
        phone: clientViewCompany.phone,
        address: clientViewCompany.address,
        website: clientViewCompany.website
      } : null;
    } else {
      return selectedCompany;
    }
  };

  const displayCompany = getDisplayCompany();

  useEffect(() => {
    if (invoice) {
      console.log('[InvoiceView] Current invoice contract terms:', {
        hasContractTerms: !!invoice.contractTerms,
        contractTermsLength: invoice.contractTerms?.length || 0,
        contractStatus: invoice.contractStatus,
        contractPreview: invoice.contractTerms?.substring(0, 100)
      });
    }
  }, [invoice]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
        <p className="text-gray-700 mb-6">{error}</p>
        <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go back to dashboard
        </Link>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-amber-600 mb-4">Invoice Not Found</h2>
        <p className="text-gray-700 mb-6">The requested invoice could not be found.</p>
        <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        {!isClientView && (
          <div className="mb-6 flex items-center">
            <Link
              to={location.pathname.includes('/admin') ? '/invoices' : '/'}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </div>
        )}

        <div className="flex flex-col" ref={invoiceRef}>
          <div className="flex flex-col md:flex-row justify-between items-start mb-6">
            {/* Company Logo/Info */}
            <div className="flex flex-col mb-4 md:mb-0">
              {displayCompany?.logo_url && (
                <img
                  src={displayCompany.logo_url}
                  alt={`${displayCompany.name} logo`}
                  className="h-16 object-contain mb-4"
                />
              )}
              <h1 className="text-3xl font-bold text-gray-900">Invoice #{invoice.number}</h1>
              <div className="flex items-center mt-2">
                <Badge 
                  variant={
                    invoice.status === 'paid' ? 'default' : 
                    invoice.status === 'accepted' ? 'outline' : 
                    invoice.status === 'sent' ? 'secondary' : 'default'
                  }
                  className="uppercase mr-2"
                >
                  {invoice.status}
                </Badge>
                <span className="text-sm text-gray-500">
                  Created: {format(new Date(invoice.date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 self-start">
              {!isClientView && (
                <>
                  <Button variant="outline" size="sm" onClick={handleCopyInvoiceLink} className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </Button>
                  <Link to={`/invoice/${invoice.id}/edit`}>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                </>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadInvoice} 
                disabled={generatingPdf}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {generatingPdf ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Invoice #</dt>
                    <dd>{invoice.number}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Date</dt>
                    <dd>{format(new Date(invoice.date), 'MMM d, yyyy')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Due Date</dt>
                    <dd>{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Amount</dt>
                    <dd className="font-bold">{formatCurrency(invoice.amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Status</dt>
                    <dd>
                      <Badge 
                        variant={
                          invoice.status === 'paid' ? 'default' : 
                          invoice.status === 'accepted' ? 'outline' : 
                          invoice.status === 'sent' ? 'secondary' : 'default'
                        }
                        className="uppercase"
                      >
                        {invoice.status}
                      </Badge>
                    </dd>
                  </div>
                  {job && (
                    <div className="pt-2">
                      <div className="flex justify-between">
                        <dt className="font-medium text-gray-500">Job</dt>
                        <dd>{job.title}</dd>
                      </div>
                      {job.date && (
                        <div className="flex justify-between">
                          <dt className="font-medium text-gray-500">Job Date</dt>
                          <dd>{format(new Date(job.date), 'MMM d, yyyy')}</dd>
                        </div>
                      )}
                    </div>
                  )}
                </dl>
              </CardContent>
              {isClientView && invoice.status !== 'accepted' && (
                <CardFooter>
                  <Button 
                    onClick={handleAcceptInvoice} 
                    className="w-full"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accept Invoice
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-2">
                      <User className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div>
                        <h3 className="font-medium">{client.name}</h3>
                      </div>
                    </div>
                    
                    {client.email && (
                      <div className="flex items-start gap-2">
                        <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                        <span>{client.email}</span>
                      </div>
                    )}
                    
                    {client.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    
                    {client.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                        <span className="whitespace-pre-line">{client.address}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No client information available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="invoice" className="w-full mb-8">
            <TabsList data-testid="tabs-list" className="mb-6">
              <TabsTrigger value="invoice">Invoice Details</TabsTrigger>
              {invoice.contractTerms && (
                <TabsTrigger value="contract">Contract Terms</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="invoice" data-testid="invoice-tab">
              {/* Items Section */}
              {invoice.items && invoice.items.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-700">
                        <thead className="text-xs uppercase bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 w-1/3">Item</th>
                            <th scope="col" className="px-4 py-3 text-center">Quantity</th>
                            <th scope="col" className="px-4 py-3 text-right">Rate</th>
                            <th scope="col" className="px-4 py-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.items.map((item, index) => (
                            <tr key={index} className="invoice-item bg-white border-b">
                              <td className="px-4 py-3">
                                <div className="font-medium">{item.name || item.productName}</div>
                                {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                              </td>
                              <td className="px-4 py-3 text-center">{item.quantity}</td>
                              <td className="px-4 py-3 text-right">{formatCurrency(item.rate)}</td>
                              <td className="px-4 py-3 text-right">{formatCurrency(item.amount)}</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50">
                            <td colSpan={3} className="px-4 py-3 text-right font-bold">Total</td>
                            <td className="px-4 py-3 text-right font-bold">{formatCurrency(invoice.amount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Schedules Section */}
              {invoice.paymentSchedules && invoice.paymentSchedules.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Payment Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PaymentScheduleTable 
                      paymentSchedules={invoice.paymentSchedules} 
                      amount={invoice.amount}
                      onUpdateStatus={isClientView ? undefined : handlePaymentStatusUpdate}
                      onUpdatePaymentDate={isClientView ? undefined : handlePaymentDateUpdate}
                      isUpdating={!!updatingPaymentId}
                      updatingId={updatingPaymentId}
                      isClientView={isClientView}
                    />
                  </CardContent>
                </Card>
              )}
              
              {/* Notes Section */}
              {invoice.notes && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rich-text-editor prose max-w-none">
                      <RichTextEditor
                        value={invoice.notes}
                        readOnly={true}
                        onChange={() => {}} // Add noop onChange handler
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {invoice.contractTerms && (
              <TabsContent value="contract" data-testid="contract-tab">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center">
                      <FileCheck className="w-5 h-5 mr-2" />
                      Contract Terms
                    </CardTitle>
                    {invoice.contractStatus === 'accepted' && (
                      <Badge variant="outline" className="ml-2 bg-green-100 text-green-800">
                        <Check className="w-4 h-4 mr-1" />
                        Accepted
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="rich-text-editor prose max-w-none">
                      <RichTextEditor
                        value={invoice.contractTerms}
                        readOnly={true}
                        onChange={() => {}} // Add noop onChange handler
                      />
                    </div>
                  </CardContent>
                  {isClientView && invoice.contractStatus !== 'accepted' && (
                    <CardFooter>
                      <Button 
                        onClick={handleAcceptContract} 
                        className="w-full"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Accept Contract Terms
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              </TabsContent>
            )}
          </Tabs>

          {/* Company Information (Client View only) */}
          {isClientView && displayCompany && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">{displayCompany.name}</span>
                  </div>
                  
                  {displayCompany.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-gray-500" />
                      <span>{displayCompany.email}</span>
                    </div>
                  )}
                  
                  {displayCompany.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-gray-500" />
                      <span>{displayCompany.phone}</span>
                    </div>
                  )}
                  
                  {displayCompany.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <span className="whitespace-pre-line">{displayCompany.address}</span>
                    </div>
                  )}
                  
                  {displayCompany.website && (
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-5 h-5 text-gray-500" />
                      <a 
                        href={displayCompany.website.startsWith('http') ? displayCompany.website : `https://${displayCompany.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {displayCompany.website}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default InvoiceView;
