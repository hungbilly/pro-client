
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";

interface PdfDebuggerProps {
  debugInfo?: any;
  pdfUrl?: string;
}

const PdfDebugger = ({ debugInfo, pdfUrl }: PdfDebuggerProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  if (!debugInfo && !pdfUrl) return null;
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          PDF Debugging Information
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
                <h4 className="text-sm font-medium mb-1">Current PDF URL</h4>
                <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                  {pdfUrl}
                </code>
              </div>
            )}
            
            {debugInfo && (
              <>
                <h4 className="text-sm font-medium mb-1">Debug Info</h4>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-[200px]">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </>
            )}
            
            <div className="text-xs text-gray-500 mt-2">
              <p>If you're having issues downloading the PDF:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Check that the URL is accessible</li>
                <li>Verify that the content type is application/pdf</li>
                <li>Try opening the URL directly in a new tab</li>
                <li>Clear your browser cache and try again</li>
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PdfDebugger;
