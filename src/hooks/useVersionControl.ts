
import { useState, useEffect, useCallback } from 'react';
import { versionControl, ComponentVersion } from '@/lib/versionControl';
import React from 'react';

export interface UseVersionControlOptions {
  componentName: string;
  autoBackup?: boolean;
  backupInterval?: number; // minutes
}

export const useVersionControl = (options: UseVersionControlOptions) => {
  const { componentName, autoBackup = false, backupInterval = 30 } = options;
  const [versions, setVersions] = useState<ComponentVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<ComponentVersion | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Load versions on mount
  useEffect(() => {
    loadVersions();
  }, [componentName]);

  // Auto-backup functionality
  useEffect(() => {
    if (!autoBackup) return;

    const interval = setInterval(() => {
      createAutoBackup();
    }, backupInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoBackup, backupInterval, componentName]);

  const loadVersions = useCallback(() => {
    const componentVersions = versionControl.getComponentVersions(componentName);
    setVersions(componentVersions);
    
    const active = componentVersions.find(v => v.isActive);
    setCurrentVersion(active || null);
  }, [componentName]);

  const createBackup = useCallback(async (
    content: string,
    metadata?: ComponentVersion['metadata']
  ): Promise<string | null> => {
    setIsBackingUp(true);
    try {
      const backupId = await versionControl.createComponentBackup(
        componentName,
        content,
        metadata
      );
      
      loadVersions();
      return backupId;
    } catch (error) {
      console.error('Failed to create backup:', error);
      return null;
    } finally {
      setIsBackingUp(false);
    }
  }, [componentName, loadVersions]);

  const createAutoBackup = useCallback(async () => {
    // Get current component content (this would need to be implemented per component)
    const content = `// Auto-backup at ${new Date().toISOString()}`;
    
    await createBackup(content, {
      description: 'Automatic backup',
      tags: ['auto', 'scheduled']
    });
  }, [createBackup]);

  const restoreVersion = useCallback(async (versionId: string): Promise<boolean> => {
    try {
      const restored = await versionControl.restoreVersion(componentName, versionId);
      if (restored) {
        loadVersions();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to restore version:', error);
      return false;
    }
  }, [componentName, loadVersions]);

  const deleteVersion = useCallback(async (versionId: string): Promise<boolean> => {
    try {
      const componentVersions = versionControl.getComponentVersions(componentName);
      const updatedVersions = componentVersions.filter(v => v.id !== versionId);
      
      // This would need to be implemented in the version control manager
      // For now, we'll just reload
      loadVersions();
      return true;
    } catch (error) {
      console.error('Failed to delete version:', error);
      return false;
    }
  }, [componentName, loadVersions]);

  return {
    versions,
    currentVersion,
    isBackingUp,
    createBackup,
    restoreVersion,
    deleteVersion,
    loadVersions,
  };
};

// HOC for automatic version control
export const withVersionControl = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
  options?: Omit<UseVersionControlOptions, 'componentName'>
) => {
  return (props: P) => {
    const versionControlProps = useVersionControl({
      componentName,
      ...options,
    });

    return React.createElement(WrappedComponent, { ...props, ...versionControlProps });
  };
};
