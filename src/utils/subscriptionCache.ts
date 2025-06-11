
interface CachedSubscription {
  hasAccess: boolean;
  subscription: any;
  isInTrialPeriod: boolean;
  trialDaysLeft: number;
  trialEndDate: string | null;
  timestamp: number;
  expiresAt: number;
}

const CACHE_KEY = 'subscription_status_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MIN_CHECK_INTERVAL = 30 * 1000; // 30 seconds minimum between checks

export class SubscriptionCache {
  private static lastCheckTime = 0;

  static shouldSkipCheck(): boolean {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastCheckTime;
    return timeSinceLastCheck < MIN_CHECK_INTERVAL;
  }

  static markCheckTime(): void {
    this.lastCheckTime = Date.now();
  }

  static get(): CachedSubscription | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data: CachedSubscription = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now > data.expiresAt) {
        this.clear();
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading subscription cache:', error);
      this.clear();
      return null;
    }
  }

  static set(subscriptionData: Omit<CachedSubscription, 'timestamp' | 'expiresAt'>): void {
    try {
      const now = Date.now();
      const cacheData: CachedSubscription = {
        ...subscriptionData,
        timestamp: now,
        expiresAt: now + CACHE_DURATION,
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving subscription cache:', error);
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Error clearing subscription cache:', error);
    }
  }

  static isExpired(): boolean {
    const cached = this.get();
    return !cached || Date.now() > cached.expiresAt;
  }
}
