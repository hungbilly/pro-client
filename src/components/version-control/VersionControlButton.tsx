
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { History, Save, RotateCcw, Download, Trash2 } from 'lucide-react';
import { useVersionControl } from '@/hooks/useVersionControl';
import { toast } from 'sonner';

interface VersionControlButtonProps {
  componentName: string;
  currentContent?: string;
  onRestore?: (content: string) => void;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

const VersionControlButton: React.FC<VersionControlButtonProps> = ({
  componentName,
  currentContent = '',
  onRestore,
  size = 'sm',
  variant = 'outline'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    versions, 
    currentVersion, 
    isBackingUp, 
    createBackup, 
    restoreVersion, 
    deleteVersion 
  } = useVersionControl({ componentName });

  const handleCreateBackup = async () => {
    const success = await createBackup(currentContent, {
      description: 'Manual backup',
      tags: ['manual']
    });
    
    if (success) {
      toast.success('Backup created successfully');
    } else {
      toast.error('Failed to create backup');
    }
    setIsOpen(false);
  };

  const handleRestoreVersion = async (versionId: string) => {
    const success = await restoreVersion(versionId);
    if (success) {
      const version = versions.find(v => v.id === versionId);
      if (version && onRestore) {
        onRestore(version.content);
      }
      toast.success('Version restored successfully');
    } else {
      toast.error('Failed to restore version');
    }
    setIsOpen(false);
  };

  const handleDeleteVersion = async (versionId: string) => {
    const success = await deleteVersion(versionId);
    if (success) {
      toast.success('Version deleted');
    } else {
      toast.error('Failed to delete version');
    }
  };

  const recentVersions = versions.slice(-5).reverse();

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="relative">
          <History className="h-4 w-4 mr-2" />
          Version Control
          {versions.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
              {versions.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          {componentName} Versions
          <Badge variant="outline">{versions.length} total</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleCreateBackup} disabled={isBackingUp}>
          <Save className="h-4 w-4 mr-2" />
          {isBackingUp ? 'Creating Backup...' : 'Create Backup'}
        </DropdownMenuItem>
        
        {recentVersions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Recent Versions</DropdownMenuLabel>
            {recentVersions.map((version) => (
              <DropdownMenuItem
                key={version.id}
                className="flex items-center justify-between p-2"
                onSelect={(e) => e.preventDefault()}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono truncate">
                      {version.version}
                    </span>
                    {version.isActive && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleDateString()} at{' '}
                    {new Date(version.createdAt).toLocaleTimeString()}
                  </p>
                  {version.metadata.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {version.metadata.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestoreVersion(version.id)}
                    disabled={version.isActive}
                    className="h-6 w-6 p-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteVersion(version.id)}
                    disabled={version.isActive}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        {versions.length === 0 && (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">No versions available</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default VersionControlButton;
