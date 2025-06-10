
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  History, 
  Download, 
  Upload, 
  GitBranch, 
  Flag, 
  Package, 
  Trash2, 
  RotateCcw,
  Save,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { versionControl, ComponentVersion, FeatureFlag } from '@/lib/versionControl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const VersionControlPanel = () => {
  const [componentVersions, setComponentVersions] = useState<Record<string, ComponentVersion[]>>({});
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load all component versions
    const allComponents = ['InvoiceView', 'Dashboard', 'ClientForm', 'JobForm', 'InvoiceForm'];
    const versions: Record<string, ComponentVersion[]> = {};
    
    allComponents.forEach(component => {
      versions[component] = versionControl.getComponentVersions(component);
    });
    
    setComponentVersions(versions);
    setFeatureFlags(versionControl.getFeatureFlags());
  };

  const handleCreateBackup = async (componentName: string) => {
    try {
      const content = `// Backup created at ${new Date().toISOString()}`;
      const id = await versionControl.createComponentBackup(
        componentName,
        content,
        {
          description: `Manual backup of ${componentName}`,
          tags: ['manual', 'backup']
        }
      );
      
      toast.success(`Backup created for ${componentName}`);
      loadData();
    } catch (error) {
      toast.error('Failed to create backup');
    }
  };

  const handleRestoreVersion = async (componentName: string, versionId: string) => {
    try {
      const restored = await versionControl.restoreVersion(componentName, versionId);
      if (restored) {
        toast.success(`Restored ${componentName} to version ${restored.version}`);
        loadData();
      } else {
        toast.error('Failed to restore version');
      }
    } catch (error) {
      toast.error('Failed to restore version');
    }
  };

  const handleToggleFeatureFlag = async (flagName: string, enabled: boolean) => {
    try {
      await versionControl.setFeatureFlag(flagName, enabled);
      toast.success(`Feature flag "${flagName}" ${enabled ? 'enabled' : 'disabled'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update feature flag');
    }
  };

  const handleExportState = () => {
    try {
      const state = versionControl.exportState();
      const blob = new Blob([state], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `app-state-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('State exported successfully');
    } catch (error) {
      toast.error('Failed to export state');
    }
  };

  const handleImportState = () => {
    try {
      versionControl.importState(importData);
      toast.success('State imported successfully');
      setShowImportDialog(false);
      setImportData('');
      loadData();
    } catch (error) {
      toast.error('Failed to import state: Invalid format');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Version Control</h1>
          <p className="text-muted-foreground">Manage component versions and feature flags</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportState}>
            <Download className="h-4 w-4 mr-2" />
            Export State
          </Button>
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import State
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Application State</DialogTitle>
                <DialogDescription>
                  Paste the exported JSON state to restore a previous backup.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Paste exported JSON here..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={10}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportState} disabled={!importData.trim()}>
                  Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList>
          <TabsTrigger value="components">
            <Package className="h-4 w-4 mr-2" />
            Components
          </TabsTrigger>
          <TabsTrigger value="features">
            <Flag className="h-4 w-4 mr-2" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="git">
            <GitBranch className="h-4 w-4 mr-2" />
            Git Integration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(componentVersions).map(([componentName, versions]) => (
              <Card key={componentName}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {componentName}
                    <Badge variant="secondary">{versions.length} versions</Badge>
                  </CardTitle>
                  <CardDescription>
                    Component version history and backup management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleCreateBackup(componentName)}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Create Backup
                  </Button>
                  
                  {versions.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Recent Versions:</Label>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {versions.slice(-3).reverse().map((version) => (
                          <div key={version.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono truncate">{version.version}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(version.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {version.isActive && (
                                <Badge variant="default" className="text-xs">Active</Badge>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRestoreVersion(componentName, version.id)}
                                disabled={version.isActive}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Control feature rollouts and component versions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {featureFlags.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <Label className="font-medium">{flag.name}</Label>
                    {flag.description && (
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                    )}
                  </div>
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(enabled) => handleToggleFeatureFlag(flag.name, enabled)}
                  />
                </div>
              ))}
              
              {featureFlags.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No feature flags configured yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="git" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Git Integration</CardTitle>
              <CardDescription>
                Connect with your Git repository for advanced version control
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-md p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="font-medium text-yellow-800 dark:text-yellow-400">
                    Git Integration Available
                  </span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                  Connect your project to GitHub for full version control capabilities.
                </p>
                <Button variant="outline" size="sm">
                  <GitBranch className="h-4 w-4 mr-2" />
                  Connect to GitHub
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Automatic commits</span>
                  <Switch defaultChecked={false} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Auto-tag releases</span>
                  <Switch defaultChecked={false} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Create branches for features</span>
                  <Switch defaultChecked={false} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VersionControlPanel;
