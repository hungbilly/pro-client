
import React, { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface PdfDebuggerProps {
  debugInfo: any;
}

const PdfDebugger: React.FC<PdfDebuggerProps> = ({ debugInfo }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!debugInfo) return null;

  // Format execution time
  const formatExecutionTime = (startTime: number, endTime: number) => {
    if (!startTime || !endTime) return 'Unknown';
    return `${(endTime - startTime).toFixed(2)}ms`;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  // Render status badge
  const renderStatusBadge = (success?: boolean) => {
    if (success === undefined) return null;
    
    return success ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded-md p-3 text-xs"
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="flex w-full justify-between p-0 h-auto">
          <span className="font-semibold">PDF Generation Debug Info</span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2 space-y-2">
        {debugInfo.timestamp && (
          <div className="flex items-center text-muted-foreground gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(debugInfo.timestamp)}</span>
          </div>
        )}
        
        {debugInfo.pdfUrl && (
          <div>
            <span className="font-semibold">PDF URL:</span> 
            <a 
              href={debugInfo.pdfUrl} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline ml-1 break-all"
            >
              {debugInfo.pdfUrl}
            </a>
          </div>
        )}
        
        {debugInfo.pdfSize && (
          <div>
            <span className="font-semibold">PDF Size:</span> 
            <span className="ml-1">
              {(debugInfo.pdfSize / 1024).toFixed(2)} KB
            </span>
          </div>
        )}
        
        {debugInfo.invoiceNumber && (
          <div>
            <span className="font-semibold">Invoice Number:</span>
            <span className="ml-1">{debugInfo.invoiceNumber}</span>
          </div>
        )}
        
        {debugInfo.companyInfo && (
          <div>
            <span className="font-semibold">Company Logo:</span>
            <span className="ml-1">
              {debugInfo.companyInfo.hasLogo ? 'Available' : 'Not available'}
            </span>
          </div>
        )}
        
        {debugInfo.warnings && debugInfo.warnings.length > 0 && (
          <div>
            <span className="font-semibold text-amber-600">Warnings:</span>
            <ul className="ml-5 list-disc text-amber-600">
              {debugInfo.warnings.map((warning: string, index: number) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        
        {debugInfo.verificationWarning && (
          <div className="text-amber-600">
            <span className="font-semibold">Verification Warning:</span>
            <div className="ml-5">
              {debugInfo.verificationWarning.message}
              {debugInfo.verificationWarning.contentType && (
                <div>Content-Type: {debugInfo.verificationWarning.contentType}</div>
              )}
            </div>
          </div>
        )}
        
        {debugInfo.stages && (
          <div>
            <div className="font-semibold mt-2 mb-1">Execution Stages:</div>
            <div className="space-y-1 ml-2">
              {Object.entries(debugInfo.stages).map(([stage, details]: [string, any]) => (
                <div key={stage} className="flex items-center justify-between">
                  <div className="capitalize">{stage.replace(/_/g, ' ')}</div>
                  <div className="flex items-center gap-2">
                    {details.end && (
                      <span className="text-gray-500">
                        {formatExecutionTime(details.start, details.end)}
                      </span>
                    )}
                    {renderStatusBadge(details.success)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {debugInfo.executionTime && (
          <div className="mt-1">
            <span className="font-semibold">Total Execution Time:</span>
            <span className="ml-1">
              {(debugInfo.executionTime / 1000).toFixed(2)}s
            </span>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default PdfDebugger;
