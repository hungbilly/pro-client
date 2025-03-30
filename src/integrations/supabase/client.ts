// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://htjvyzmuqsrjpesdurni.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0anZ5em11cXNyanBlc2R1cm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MDg0NTIsImV4cCI6MjA1Njk4NDQ1Mn0.AtFzj0Ail1PgKmXJcPWyWnXqC6EbMP0UOlH4m_rhkq8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Add a debug logging function 
export const logDebug = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Supabase Debug] ${message}`, data ? data : '');
};

// Add detailed error logging
export const logError = (message: string, error: any) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [Supabase Error] ${message}`, error);
  
  // Log additional details if available
  if (error?.message) {
    console.error(`Error message: ${error.message}`);
  }
  
  if (error?.code) {
    console.error(`Error code: ${error.code}`);
  }
  
  if (error?.details) {
    console.error(`Error details:`, error.details);
  }
};

// Add data transformation debugging
export const logDataTransformation = (stage: string, data: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Data Transform] ${stage}`, data);
};

// Add date handling debugging
export const logDateProcessing = (context: string, dateInfo: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Date Processing] ${context}`, dateInfo);
};

// Add payment processing debugging
export const logPaymentProcessing = (context: string, paymentInfo: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Payment Processing] ${context}`, paymentInfo);
};

// Enhanced company data debugging
export const logCompanyData = (context: string, companyInfo: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Company Data] ${context}`, companyInfo);
  
  // Add specific logging for logo URL issues
  if (companyInfo && typeof companyInfo === 'object') {
    if (companyInfo.logo_url) {
      console.log(`[${timestamp}] [Company Logo] Found logo_url:`, companyInfo.logo_url);
    } else if (companyInfo.logoUrl) {
      console.log(`[${timestamp}] [Company Logo] Found logoUrl:`, companyInfo.logoUrl);
    } else {
      console.log(`[${timestamp}] [Company Logo] No logo URL found in company data`);
    }
    
    // Add address formatting logging
    if (companyInfo.address) {
      console.log(`[${timestamp}] [Company Address] Address format:`, {
        original: companyInfo.address,
        lines: companyInfo.address.split('\n'),
        length: companyInfo.address.length
      });
    }
  }
};

// Helper function to format dates consistently
export const formatDate = (date: Date | string): string => {
  try {
    if (typeof date === 'string') {
      // If it's already a string, make sure it's a valid date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        logError('Invalid date string', { date });
        return '';
      }
      return parsedDate.toISOString();
    } else {
      return date.toISOString();
    }
  } catch (error) {
    logError('Error formatting date', { date, error });
    return '';
  }
};

// Helper function to parse dates safely
export const parseDate = (dateString: string): Date | null => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      logError('Invalid date string during parsing', { dateString });
      return null;
    }
    return date;
  } catch (error) {
    logError('Error parsing date', { dateString, error });
    return null;
  }
};

// Format date for display
export const formatDisplayDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      logError('Invalid date string for display formatting', { dateString });
      return '';
    }
    return date.toLocaleDateString();
  } catch (error) {
    logError('Error formatting display date', { dateString, error });
    return '';
  }
};

// Add a new utility for handling database deadlock errors
export const handleDeadlockError = async (operation: () => Promise<any>, maxRetries = 3): Promise<any> => {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      logError('Database operation error', error);
      
      // Check if it's a deadlock error
      const isDeadlock = 
        error.message?.toLowerCase().includes('deadlock') || 
        error.code === '40P01';  // PostgreSQL deadlock error code
      
      if (isDeadlock && retryCount < maxRetries - 1) {
        // Calculate delay with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        logDebug(`Deadlock detected, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      } else {
        // Either not a deadlock or we've exceeded max retries
        throw error;
      }
    }
  }
};

// Add database transaction utilities
export const withTransaction = async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
  try {
    // Start transaction
    const { error: startError } = await supabase.rpc('begin_transaction');
    if (startError) throw startError;
    
    // Execute callback
    const result = await callback(supabase);
    
    // Commit transaction
    const { error: commitError } = await supabase.rpc('commit_transaction');
    if (commitError) throw commitError;
    
    return result;
  } catch (error) {
    // Rollback transaction on error
    await supabase.rpc('rollback_transaction').catch(e => {
      logError('Error rolling back transaction', e);
    });
    
    throw error;
  }
};

// Export supabase instance
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
