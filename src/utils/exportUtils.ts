
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

type ExportFormat = 'csv' | 'xlsx';

interface ExportOptions {
  filename: string;
  format: ExportFormat;
  dateRange?: DateRange | null;
}

export const exportDataToFile = <T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
) => {
  const { filename, format, dateRange } = options;
  
  if (data.length === 0) {
    console.error('No data to export');
    toast.error('No data to export');
    return;
  }
  
  // Filter data by date range if provided
  let filteredData = data;
  if (dateRange?.from) {
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    
    let toDate: Date;
    if (dateRange.to) {
      toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
    } else {
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
    }
    
    filteredData = data.filter(item => {
      // Try various date field names that might exist in the data
      const dateField = item.createdAt || item.created_at || item.date;
      if (!dateField) return false;
      
      const itemDate = new Date(dateField);
      return itemDate >= fromDate && itemDate <= toDate;
    });
    
    if (filteredData.length === 0) {
      console.error('No data matches the selected date range');
      toast.error('No data matches the selected date range. Try a different date range or export all data.');
      return;
    }
  }
  
  if (format === 'csv') {
    exportToCSV(filteredData, filename);
  } else if (format === 'xlsx') {
    exportToXLSX(filteredData, filename);
  }
};

const exportToCSV = <T extends Record<string, any>>(data: T[], filename: string) => {
  // Get headers from the first object's keys
  const headers = Object.keys(data[0]);
  
  // Create CSV header row
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  data.forEach(item => {
    const row = headers.map(header => {
      // Handle values that might need escaping
      const value = item[header];
      if (value === null || value === undefined) {
        return '';
      }
      
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if the value contains commas or quotes
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
    
    csvContent += row + '\n';
  });
  
  // Create a blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

const exportToXLSX = <T extends Record<string, any>>(data: T[], filename: string) => {
  // Create a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Create a workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  // Generate an array buffer and convert to blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Save the file
  saveAs(blob, `${filename}.xlsx`);
};

// Functions to format data for export
export const formatPaymentsForExport = (payments: any[]) => {
  return payments.map(payment => ({
    'Status': payment.status.charAt(0).toUpperCase() + payment.status.slice(1),
    'Due Date': payment.dueDate,
    'Invoice Number': payment.invoiceNumber,
    'Client': payment.clientName,
    'Job': payment.jobTitle || 'N/A',
    'Amount': payment.amount.toFixed(2)
  }));
};

export const formatExpensesForExport = (expenses: any[]) => {
  return expenses.map(expense => ({
    'Date': expense.date,
    'Description': expense.description,
    'Category': expense.category.name,
    'Amount': expense.amount.toFixed(2)
  }));
};

export const formatClientsForExport = (clients: any[]) => {
  return clients.map(client => ({
    'Name': client.name,
    'Email': client.email,
    'Phone': client.phone,
    'Address': client.address || 'N/A',
    'Created': client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A',
    'Notes': client.notes || ''
  }));
};

export const formatJobsForExport = (jobs: any[], clients?: any[]) => {
  return jobs.map(job => {
    const clientName = clients?.find(c => c.id === job.clientId)?.name || 'Unknown Client';
    
    return {
      'Title': job.title,
      'Client': clientName,
      'Date': job.date ? new Date(job.date).toLocaleDateString() : 'N/A',
      'Time': job.isFullDay ? 'Full Day' : (job.startTime && job.endTime ? `${job.startTime} - ${job.endTime}` : 'N/A'),
      'Location': job.location || 'N/A',
      'Status': job.status.charAt(0).toUpperCase() + job.status.slice(1),
      'Description': job.description || '',
      'Created': job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'
    };
  });
};

export const formatInvoicesForExport = (invoices: any[], clients?: any[], jobs?: any[]) => {
  return invoices.map(invoice => {
    const clientName = clients?.find(c => c.id === invoice.clientId)?.name || 'Unknown Client';
    const jobTitle = jobs?.find(j => j.id === invoice.jobId)?.title || 'N/A';
    
    return {
      'Invoice #': invoice.number || 'Draft',
      'Client': clientName,
      'Job': jobTitle,
      'Date': invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A',
      'Due Date': invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A',
      'Amount': invoice.amount ? invoice.amount.toFixed(2) : '0.00',
      'Status': invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
      'Created': invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'N/A'
    };
  });
};
