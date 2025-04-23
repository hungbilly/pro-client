
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// currency helpers
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gets currency symbol for given code
 */
export function getCurrencySymbol(currency: string) {
  switch (currency?.toLowerCase?.()) {
    case "hkd": return "HK$";
    case "usd": return "$";
    case "eur": return "€";
    case "jpy": return "¥";
    case "aud": return "A$";
    case "gbp": return "£";
    case "cad": return "CA$";
    case "chf": return "CHF";
    case "cny": return "¥";
    case "inr": return "₹";
    case "mxn": return "MX$";
    case "brl": return "R$";
    case "rub": return "₽";
    case "krw": return "₩";
    case "sgd": return "S$";
    case "nzd": return "NZ$";
    case "sek": return "kr";
    case "zar": return "R";
    case "thb": return "฿";
    case "dkk": return "kr";
    default: return "$";
  }
}

/**
 * Formats amount as currency using given code
 */
export function formatCurrency(amount: number, currency: string = 'USD', opts?: { symbolOnly?: boolean }) {
  if (opts?.symbolOnly) {
    return getCurrencySymbol(currency);
  }
  
  // Get the currency symbol to use for formatting
  const symbol = getCurrencySymbol(currency);
  
  // Use Intl NumberFormat to format the number according to locale standards
  const formattedNumber = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  // Combine the symbol and formatted number
  return `${symbol}${formattedNumber}`;
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
