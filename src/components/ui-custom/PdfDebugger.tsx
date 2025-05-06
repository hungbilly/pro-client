
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronsUpDown, FileWarning, FileCheck, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PdfDebuggerProps {
  debugInfo?: any;
  pdfUrl?: string;
  downloadError?: string;
  downloadAttempts?: number;
}

const PdfDebugger = ({ debugInfo, pdfUrl, downloadError, downloadAttempts = 0 }: PdfDebuggerProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  if (!debugInfo && !pdfUrl && !downloadError) return null;
  
  // Check if the PDF URL appears valid
  const isPdfUrlValid = pdfUrl && 
    (pdfUrl.toLowerCase().endsWith('.pdf') || 
     pdfUrl.includes('?t=') || 
     pdfUrl.includes('/pdf'));

  // Extract file type from URL or debug info
  const extractFileType = () => {
    if (debugInfo?.finalVerification?.contentType) {
      return debugInfo.finalVerification.contentType;
    }
    
    if (debugInfo?.pdfInfo?.contentType) {
      return debugInfo.pdfInfo.contentType;
    }
    
    if (pdfUrl?.includes('invoice-pdfs')) {
      return 'application/pdf (assumed from storage bucket)';
    }
    
    return 'unknown';
  };

  // Extract file size
  const fileSize = debugInfo?.pdfSize || 
                  debugInfo?.finalVerification?.contentLength || 
                  debugInfo?.pdfInfo?.contentLength || 
                  'unknown';
  
  // Check if file size is suspiciously large (> 5MB)
  const isFileSizeSuspicious = fileSize && !isNaN(parseInt(fileSize)) && parseInt(fileSize) > 5000000;
  
  // Check if content type is suspicious (contains multiple types or wrong type)
  const contentType = extractFileType();
  const isContentTypeSuspicious = contentType && 
    (contentType.includes(',') || 
     !contentType.includes('pdf'));

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            PDF Debugging Information
            {isContentTypeSuspicious && (
              <Badge variant="destructive" className="text-xs">Content Type Issue</Badge>
            )}
            {isFileSizeSuspicious && (
              <Badge variant="destructive" className="text-xs">Size Issue</Badge>
            )}
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </CardTitle>
      </CardHeader>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {pdfUrl && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                  Current PDF URL
                  {isPdfUrlValid ? (
                    <FileCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <FileWarning className="h-4 w-4 text-amber-500" />
                  )}
                </h4>
                <code className="text-xs bg-slate-100 p-2 rounded block break-all">
                  {pdfUrl}
                </code>
                
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Content Type:</span>{" "}
                    <span className={isContentTypeSuspicious ? "text-red-600 font-semibold" : ""}>
                      {contentType}
                    </span>
                    {isContentTypeSuspicious && (
                      <p className="text-red-600 mt-1">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        Content type should be "application/pdf" only
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">File Size:</span>{" "}
                    <span className={isFileSizeSuspicious ? "text-red-600 font-semibold" : ""}>
                      {fileSize !== 'unknown' 
                        ? `${(parseInt(fileSize) / 1024).toFixed(2)} KB`
                        : 'unknown'
                      }
                    </span>
                    {isFileSizeSuspicious && (
                      <p className="text-red-600 mt-1">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        File size is suspiciously large
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {downloadError && (
              <div className="mb-4 bg-red-50 p-3 rounded border border-red-200">
                <h4 className="text-sm font-medium text-red-800 mb-1 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Download Error
                </h4>
                <pre className="text-xs text-red-700 whitespace-pre-wrap">
                  {downloadError}
                </pre>
                {downloadAttempts > 0 && (
                  <div className="mt-2 text-xs text-red-700">
                    Attempts: {downloadAttempts}
                  </div>
                )}
              </div>
            )}
            
            {debugInfo && (
              <>
                <Separator className="my-3" />
                <h4 className="text-sm font-medium mb-1">PDF Generation Info</h4>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  {debugInfo.executionTime && (
                    <div>
                      <span className="font-medium">Generation Time:</span>{" "}
                      {(debugInfo.executionTime / 1000).toFixed(2)}s
                    </div>
                  )}
                  {debugInfo.pdfSize && (
                    <div>
                      <span className="font-medium">PDF Size:</span>{" "}
                      {(debugInfo.pdfSize / 1024).toFixed(2)} KB
                    </div>
                  )}
                  {debugInfo.invoiceNumber && (
                    <div>
                      <span className="font-medium">Invoice Number:</span>{" "}
                      {debugInfo.invoiceNumber}
                    </div>
                  )}
                  {debugInfo.finalVerification && (
                    <div>
                      <span className="font-medium">Verification Status:</span>{" "}
                      <Badge variant={debugInfo.finalVerification.ok ? "success" : "destructive"}>
                        {debugInfo.finalVerification.ok ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                  )}
                </div>
                
                <h4 className="text-sm font-medium mb-1">Full Debug Info</h4>
                <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-[200px]">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </>
            )}
            
            <div className="text-xs text-gray-500 mt-4 bg-blue-50 p-2 rounded">
              <p className="font-medium mb-1">Common PDF Issues:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Invalid content type (should be <code className="bg-blue-100 px-1">application/pdf</code> only)</li>
                <li>Excessively large file size (PDFs should typically be 100KB-3MB)</li>
                <li>JSON data accidentally included in PDF content</li>
                <li>File access permissions issues in storage</li>
                <li>Corrupt PDF generation</li>
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PdfDebugger;
