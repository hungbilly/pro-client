
export interface ComponentVersion {
  id: string;
  componentName: string;
  version: string;
  content: string;
  metadata: {
    description?: string;
    author?: string;
    tags?: string[];
    breaking_changes?: boolean;
  };
  createdAt: string;
  isActive: boolean;
}

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  componentVersionId?: string;
  rolloutPercentage?: number;
}

class VersionControlManager {
  private static instance: VersionControlManager;
  private backupStorage: Map<string, ComponentVersion[]> = new Map();

  static getInstance(): VersionControlManager {
    if (!VersionControlManager.instance) {
      VersionControlManager.instance = new VersionControlManager();
    }
    return VersionControlManager.instance;
  }

  // Create a backup of a component before changes
  async createComponentBackup(
    componentName: string,
    content: string,
    metadata: ComponentVersion['metadata'] = {}
  ): Promise<string> {
    const version = this.generateVersionNumber();
    const backup: ComponentVersion = {
      id: crypto.randomUUID(),
      componentName,
      version,
      content,
      metadata: {
        ...metadata,
        author: await this.getCurrentUser(),
      },
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    // Store in memory
    const existing = this.backupStorage.get(componentName) || [];
    // Mark all existing versions as inactive
    existing.forEach(v => v.isActive = false);
    existing.push(backup);
    this.backupStorage.set(componentName, existing);

    // Store in localStorage for persistence
    this.saveToLocalStorage();

    return backup.id;
  }

  // Get all versions of a component
  getComponentVersions(componentName: string): ComponentVersion[] {
    return this.backupStorage.get(componentName) || [];
  }

  // Restore a specific version
  async restoreVersion(componentName: string, versionId: string): Promise<ComponentVersion | null> {
    const versions = this.getComponentVersions(componentName);
    const version = versions.find(v => v.id === versionId);
    
    if (version) {
      // Mark all versions as inactive
      versions.forEach(v => v.isActive = false);
      // Mark restored version as active
      version.isActive = true;
      
      this.saveToLocalStorage();
      
      return version;
    }
    
    return null;
  }

  // Feature flag management
  async setFeatureFlag(name: string, enabled: boolean, componentVersionId?: string): Promise<void> {
    const flags = this.getFeatureFlags();
    const existingIndex = flags.findIndex(f => f.name === name);
    
    const flag: FeatureFlag = {
      id: existingIndex >= 0 ? flags[existingIndex].id : crypto.randomUUID(),
      name,
      enabled,
      componentVersionId,
    };

    if (existingIndex >= 0) {
      flags[existingIndex] = flag;
    } else {
      flags.push(flag);
    }

    localStorage.setItem('app_feature_flags', JSON.stringify(flags));
  }

  getFeatureFlags(): FeatureFlag[] {
    const stored = localStorage.getItem('app_feature_flags');
    return stored ? JSON.parse(stored) : [];
  }

  isFeatureEnabled(name: string): boolean {
    const flags = this.getFeatureFlags();
    const flag = flags.find(f => f.name === name);
    return flag ? flag.enabled : false;
  }

  // Export current state for backup
  exportState(): string {
    const state = {
      components: Object.fromEntries(this.backupStorage),
      featureFlags: this.getFeatureFlags(),
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(state, null, 2);
  }

  // Import state from backup
  importState(stateJson: string): void {
    try {
      const state = JSON.parse(stateJson);
      
      // Restore components
      this.backupStorage.clear();
      Object.entries(state.components).forEach(([name, versions]) => {
        this.backupStorage.set(name, versions as ComponentVersion[]);
      });

      // Restore feature flags
      if (state.featureFlags) {
        localStorage.setItem('app_feature_flags', JSON.stringify(state.featureFlags));
      }

      this.saveToLocalStorage();
    } catch (error) {
      console.error('Failed to import state:', error);
      throw new Error('Invalid state format');
    }
  }

  // Git integration helpers
  async createGitTag(version: string, message: string): Promise<void> {
    // This would integrate with Git API if available
    console.log(`Creating Git tag: ${version} - ${message}`);
    // For now, just log the action
  }

  // Private methods
  private generateVersionNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `v${timestamp}-${random}`;
  }

  private async getCurrentUser(): Promise<string> {
    return 'admin';
  }

  private saveToLocalStorage(): void {
    const data = Object.fromEntries(this.backupStorage);
    localStorage.setItem('app_component_versions', JSON.stringify(data));
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem('app_component_versions');
    if (stored) {
      const data = JSON.parse(stored);
      this.backupStorage = new Map(Object.entries(data));
    }
  }

  // Initialize the manager
  init(): void {
    this.loadFromLocalStorage();
  }
}

export const versionControl = VersionControlManager.getInstance();

// Initialize on module load
versionControl.init();
