
import { versionControl } from './versionControl';

// Utility functions for easy component backup integration
export class ComponentBackup {
  private static backupQueue: Map<string, NodeJS.Timeout> = new Map();

  // Schedule a backup after a delay (debounced)
  static scheduleBackup(
    componentName: string, 
    content: string, 
    delay: number = 5000
  ): void {
    // Clear existing timeout
    const existingTimeout = this.backupQueue.get(componentName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new backup
    const timeout = setTimeout(async () => {
      await versionControl.createComponentBackup(
        componentName,
        content,
        {
          description: 'Auto-save backup',
          tags: ['auto-save']
        }
      );
      this.backupQueue.delete(componentName);
    }, delay);

    this.backupQueue.set(componentName, timeout);
  }

  // Create immediate backup
  static async createImmediate(
    componentName: string,
    content: string,
    description?: string
  ): Promise<string | null> {
    try {
      return await versionControl.createComponentBackup(
        componentName,
        content,
        {
          description: description || 'Manual backup',
          tags: ['manual']
        }
      );
    } catch (error) {
      console.error('Failed to create backup:', error);
      return null;
    }
  }

  // Restore to previous version
  static async restore(
    componentName: string,
    versionId: string
  ): Promise<string | null> {
    try {
      const version = await versionControl.restoreVersion(componentName, versionId);
      return version?.content || null;
    } catch (error) {
      console.error('Failed to restore version:', error);
      return null;
    }
  }

  // Get component history
  static getHistory(componentName: string) {
    return versionControl.getComponentVersions(componentName);
  }
}

// Decorator for automatic backup on component changes
export function withAutoBackup(componentName: string) {
  return function<T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      componentDidUpdate() {
        // Schedule backup when component updates
        ComponentBackup.scheduleBackup(
          componentName,
          this.toString() || `// Component: ${componentName}`
        );
        
        // Call original componentDidUpdate if it exists
        if (super.componentDidUpdate) {
          super.componentDidUpdate();
        }
      }
    };
  };
}
