
import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'xlsx') => void;
  title: string;
  description: string;
  count: number;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  title,
  description,
  count
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm mb-2">
            {count} record{count !== 1 ? 's' : ''} will be exported based on your current filters.
          </p>
          <p className="text-sm text-muted-foreground">
            Select a format to export your data:
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center h-24 p-4"
            onClick={() => {
              onExport('csv');
              onClose();
            }}
          >
            <FileText className="h-8 w-8 mb-2 text-blue-500" />
            <span>CSV Format</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center h-24 p-4"
            onClick={() => {
              onExport('xlsx');
              onClose();
            }}
          >
            <FileSpreadsheet className="h-8 w-8 mb-2 text-green-500" />
            <span>Excel Format</span>
          </Button>
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
