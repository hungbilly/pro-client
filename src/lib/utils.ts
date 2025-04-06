
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Formats a date to Google Calendar compatible format
 * @param date JavaScript Date object
 * @param removeTimezone Whether to remove timezone info (for all-day events)
 * @returns Formatted date string for Google Calendar URL
 */
export function formatDateForGoogleCalendar(date: Date, removeTimezone: boolean = false): string {
  if (removeTimezone) {
    // Format: YYYYMMDD (for all-day events)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
  
  // Format: YYYYMMDDTHHMMSS (for events with specific times)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}00`;
}
