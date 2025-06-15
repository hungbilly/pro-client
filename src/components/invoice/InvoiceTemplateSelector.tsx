
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FormLabel } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { InvoiceTemplate } from "@/types";

interface InvoiceTemplateSelectorProps {
  templates: InvoiceTemplate[];
  selectedTemplate: string | null;
  onTemplateChange: (id: string) => void;
  onClear: () => void;
}

const InvoiceTemplateSelector: React.FC<InvoiceTemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onTemplateChange,
  onClear
}) => {
  if (templates.length === 0) return null;
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4">
          <div className="flex-grow">
            <FormLabel>Use Template (Optional)</FormLabel>
            <Select
              value={selectedTemplate || ""}
              onValueChange={onTemplateChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={onClear}
            className="mt-6"
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceTemplateSelector;
