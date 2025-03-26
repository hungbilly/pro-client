
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getInvoiceByViewLink, updateInvoiceStatus, updateContractStatus } from '@/lib/storage';
import { Invoice } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, FileCheck, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { supabase, logDebug, logError } from "@/integrations/supabase/client";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from '@/components/RichTextEditor';

const InvoicePdfView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [functionError, setFunctionError] = useState<string | null>(null);
  const [clientSidePdfGenerating, setClientSidePdfGenerating] = useState(false);
  const { viewLink } = useParams<{ viewLink: string }>();
  const pdfContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        if (!viewLink) {
          setError('Invalid URL. Please provide a valid invoice link.');
          return;
        }

        const cleanViewLink = viewLink.includes('/')
          ? viewLink.split('/').pop() || viewLink
          : viewLink;

        logDebug('Fetching invoice with cleaned view link:', cleanViewLink);
        
        const fetchedInvoice = await getInvoiceByViewLink(cleanViewLink);
        if (!fetchedInvoice) {
          setError('Invoice not found. Please check the URL or contact support.');
          return;
        }

        setInvoice(fetchedInvoice);
        
        if (!fetchedInvoice.pdfUrl) {
          generateClientSidePdf();
        }
      } catch (err) {
        console.error('Failed to load invoice:', err);
        setError('Failed to load invoice. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [viewLink]);

  const generateClientSidePdf = () => {
    if (!pdfContainerRef.current) {
      toast.error('Cannot generate PDF: content not found');
      return;
    }

    try {
      setClientSidePdfGenerating(true);
      toast.info('Generating PDF from page content...');

      const element = pdfContainerRef.current;
      
      const invoiceTab = element.querySelector('[data-testid="invoice-tab"]');
      const contractTab = element.querySelector('[data-testid="contract-tab"]');
      const tabsList = element.querySelector('[data-testid="tabs-list"]');
      
      // Store original display styles to restore later
      const originalStyles = {
        tabsList: tabsList ? (tabsList as HTMLElement).style.display : '',
        invoiceTab: invoiceTab ? (invoiceTab as HTMLElement).style.display : '',
        contractTab: contractTab ? (contractTab as HTMLElement).style.display : '',
      };
      
      // Prepare for PDF generation
      if (tabsList) (tabsList as HTMLElement).style.display = 'none';
      
      if (invoiceTab) {
        (invoiceTab as HTMLElement).style.display = 'block';
        (invoiceTab as HTMLElement).style.visibility = 'visible';
      }
      
      if (contractTab) {
        (contractTab as HTMLElement).style.display = 'block';
        (contractTab as HTMLElement).style.visibility = 'visible';
        (contractTab as HTMLElement).style.pageBreakBefore = 'always';
      }
      
      // Hide buttons and other elements not needed in the PDF
      const buttonsToHide = element.querySelectorAll('button, .no-print');
      const buttonOriginalStyles: Record<string, string> = {};
      
      buttonsToHide.forEach((button, i) => {
        const el = button as HTMLElement;
        buttonOriginalStyles[i] = el.style.display;
        el.style.display = 'none';
      });

      // Generate PDF with enhanced quality settings
      html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          const clonedInvoiceTab = clonedDoc.querySelector('[data-testid="invoice-tab"]');
          const clonedContractTab = clonedDoc.querySelector('[data-testid="contract-tab"]');
          
          if (clonedInvoiceTab) {
            (clonedInvoiceTab as HTMLElement).style.display = 'block';
            (clonedInvoiceTab as HTMLElement).style.visibility = 'visible';
          }
          
          if (clonedContractTab) {
            (clonedContractTab as HTMLElement).style.display = 'block';
            (clonedContractTab as HTMLElement).style.visibility = 'visible';
            (clonedContractTab as HTMLElement).style.pageBreakBefore = 'always';
          }
        }
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        let position = 0;
        
        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        
        // Add additional pages if needed
        const totalPages = Math.ceil(imgHeight / pageHeight);
        for (let i = 1; i < totalPages; i++) {
          position = -pageHeight * i;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        }
        
        // Save the PDF
        pdf.save(`invoice-${invoice?.number || 'download'}.pdf`);
        toast.success('PDF generated successfully');
      }).catch(err => {
        console.error('Error in html2canvas:', err);
        toast.error(`PDF generation error: ${err.message}`);
      }).finally(() => {
        // Restore original styles
        if (tabsList) (tabsList as HTMLElement).style.display = originalStyles.tabsList;
        if (invoiceTab) (invoiceTab as HTMLElement).style.display = originalStyles.invoiceTab;
        if (contractTab) (contractTab as HTMLElement).style.display = originalStyles.contractTab;
        
        buttonsToHide.forEach((button, i) => {
          const el = button as HTMLElement;
          el.style.display = buttonOriginalStyles[i] || '';
        });
        
        setClientSidePdfGenerating(false);
      });
    } catch (err) {
      console.error('Error generating client-side PDF:', err);
      toast.error('Failed to generate PDF. Please try again.');
      setClientSidePdfGenerating(false);
    }
  };

  const handleRetryGeneratePdf = () => {
    if (!invoice) return;
    generateClientSidePdf();
  };

  const handleAcceptInvoice = async () => {
    if (!invoice) return;

    try {
      await updateInvoiceStatus(invoice.id, 'accepted');
      setInvoice(prev => prev ? { ...prev, status: 'accepted' } : null);
      toast.success('Invoice accepted successfully');
    } catch (err) {
      console.error('Failed to accept invoice:', err);
      toast.error('Error accepting invoice');
    }
  };

  const handleAcceptContract = async () => {
    if (!invoice) return;

    try {
      await updateContractStatus(invoice.id, 'accepted');
      setInvoice(prev => prev ? { ...prev, contractStatus: 'accepted' } : null);
      toast.success('Contract terms accepted successfully');
    } catch (err) {
      console.error('Failed to accept contract:', err);
      toast.error('Error accepting contract terms');
    }
  };

  const renderPdfDownloadButtons = () => (
    <div className="flex justify-center gap-2 mt-4">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={generateClientSidePdf} 
        disabled={clientSidePdfGenerating}
        className="w-full sm:w-auto"
      >
        {clientSidePdfGenerating ? 
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : 
          <Download className="h-4 w-4 mr-2" />
        }
        Download as PDF
      </Button>
    </div>
  );

  if (loading) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <p className="mb-2">Loading invoice...</p>
            <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-500 border-l-blue-200 border-r-blue-200 rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Error</h2>
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!invoice) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Not Found</h2>
            <p>Invoice not found. Please check the URL or contact support.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Invoice #{invoice?.number}</h1>
          <p className="text-muted-foreground">
            Please review the invoice and contract terms below.
          </p>
          {renderPdfDownloadButtons()}
        </div>

        <Card className="bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row justify-between items-center">
              <span>Invoice #{invoice?.number}</span>
              <div className="flex gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                {renderPdfDownloadButtons()}
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div ref={pdfContainerRef}>
              <Tabs defaultValue="invoice" className="w-full">
                <TabsList className="w-full no-print" data-testid="tabs-list">
                  <TabsTrigger value="invoice" className="flex-1">
                    Invoice Details
                  </TabsTrigger>
                  <TabsTrigger value="contract" className="flex-1">
                    Contract Terms
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="invoice" className="mt-6" data-testid="invoice-tab">
                  <div className="invoice-content">
                    <h2 className="text-2xl font-bold mb-4">Invoice #{invoice.number}</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Invoice Details</h3>
                        <p><strong>Date:</strong> {new Date(invoice.date).toLocaleDateString()}</p>
                        <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> {invoice.status}</p>
                        <p><strong>Amount:</strong> ${invoice.amount}</p>
                      </div>
                      
                      <div>
                        {invoice.notes && (
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold mb-2">Notes</h3>
                            <div dangerouslySetInnerHTML={{ __html: invoice.notes }} />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {invoice.items && invoice.items.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">Items</h3>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                              <th className="border p-2 text-left">Item</th>
                              <th className="border p-2 text-left">Description</th>
                              <th className="border p-2 text-right">Quantity</th>
                              <th className="border p-2 text-right">Rate</th>
                              <th className="border p-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoice.items.map((item, index) => (
                              <tr key={index} className="border-b">
                                <td className="border p-2">{item.name}</td>
                                <td className="border p-2">
                                  <div dangerouslySetInnerHTML={{ __html: item.description }} />
                                </td>
                                <td className="border p-2 text-right">{item.quantity}</td>
                                <td className="border p-2 text-right">${item.rate}</td>
                                <td className="border p-2 text-right">${item.amount}</td>
                              </tr>
                            ))}
                            <tr className="font-bold">
                              <td colSpan={4} className="border p-2 text-right">Total</td>
                              <td className="border p-2 text-right">${invoice.amount}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {['draft', 'sent'].includes(invoice.status) && (
                      <div className="mt-6 no-print">
                        <Button onClick={handleAcceptInvoice}>
                          <Check className="h-4 w-4 mr-2" />
                          Accept Invoice
                        </Button>
                      </div>
                    )}
                    
                    {invoice.status === 'accepted' && (
                      <div className="mt-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-green-800 dark:text-green-400">
                          Invoice accepted
                        </span>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="contract" className="mt-6" data-testid="contract-tab">
                  <div className="contract-content">
                    <h2 className="text-2xl font-bold mb-4">Contract Terms</h2>
                    
                    {invoice.contractTerms ? (
                      <div className="contract-terms-content">
                        <RichTextEditor
                          value={invoice.contractTerms}
                          onChange={() => {}}
                          readOnly={true}
                          className="rich-text-editor"
                        />
                      </div>
                    ) : (
                      <p>No contract terms provided.</p>
                    )}
                    
                    {invoice.contractStatus !== 'accepted' && (
                      <div className="mt-6 no-print">
                        <Button onClick={handleAcceptContract} variant="outline">
                          <Check className="h-4 w-4 mr-2" />
                          Accept Contract Terms
                        </Button>
                      </div>
                    )}
                    
                    {invoice.contractStatus === 'accepted' && (
                      <div className="mt-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-green-800 dark:text-green-400">
                          Contract terms accepted
                        </span>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
          
          <CardFooter className="flex-col gap-4 pt-4">
            <div className="w-full flex flex-col sm:flex-row gap-4 justify-center items-center no-print">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateClientSidePdf} 
                disabled={clientSidePdfGenerating}
                className="w-full sm:w-auto"
              >
                {clientSidePdfGenerating ? 
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : 
                  <Download className="h-4 w-4 mr-2" />
                }
                Download as PDF
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      <style>
        {`
          @media print {
            body * {
              visibility: visible;
            }
            .no-print {
              display: none !important;
            }
            [data-testid="tabs-list"] {
              display: none !important;
            }
            [data-testid="invoice-tab"],
            [data-testid="contract-tab"] {
              display: block !important;
              visibility: visible !important;
            }
            [data-testid="contract-tab"] {
              page-break-before: always !important;
            }
            .container {
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .card {
              box-shadow: none !important;
              border: none !important;
            }
            .rich-text-editor {
              border: none !important;
            }
          }
        `}
      </style>
    </PageTransition>
  );
};

export default InvoicePdfView;
