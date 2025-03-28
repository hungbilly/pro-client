
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

type ExportFormat = 'csv' | 'xlsx';

interface ExportOptions {
  filename: string;
  format: ExportFormat;
}

export const exportDataToFile = <T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
) => {
  const { filename, format } = options;
  
  if (data.length === 0) {
    console.error('No data to export');
    return;
  }
  
  if (format === 'csv') {
    exportToCSV(data, filename);
  } else if (format === 'xlsx') {
    exportToXLSX(data, filename);
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
