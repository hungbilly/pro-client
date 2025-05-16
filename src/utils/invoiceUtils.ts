
export const sortInvoices = (
  invoices: any[],
  sortConfig: { key: string; direction: 'asc' | 'desc' | null },
  getClientName: (clientId: string) => string,
  getJobName: (jobId: string) => string,
  jobDates: Record<string, string>
) => {
  if (!sortConfig.direction) {
    return invoices;
  }
  
  return [...invoices].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortConfig.key) {
      case 'number':
        aValue = a.number || '';
        bValue = b.number || '';
        break;
      case 'client':
        aValue = getClientName(a.clientId);
        bValue = getClientName(b.clientId);
        break;
      case 'job':
        aValue = getJobName(a.jobId);
        bValue = getJobName(b.jobId);
        break;
      case 'date':
        aValue = new Date(a.date || 0).getTime();
        bValue = new Date(b.date || 0).getTime();
        break;
      case 'shootingDate':
        if (a.shootingDate) {
          aValue = new Date(a.shootingDate).getTime();
        } else if (a.jobId && jobDates[a.jobId]) {
          aValue = new Date(jobDates[a.jobId]).getTime();
        } else {
          aValue = 0;
        }
        
        if (b.shootingDate) {
          bValue = new Date(b.shootingDate).getTime();
        } else if (b.jobId && jobDates[b.jobId]) {
          bValue = new Date(jobDates[b.jobId]).getTime();
        } else {
          bValue = 0;
        }
        break;
      case 'amount':
        aValue = a.amount || 0;
        bValue = b.amount || 0;
        break;
      case 'status':
        const statusOrder = { 'paid': 1, 'accepted': 2, 'sent': 3, 'draft': 4, 'overdue': 5 };
        aValue = statusOrder[a.status] || 999;
        bValue = statusOrder[b.status] || 999;
        break;
      default:
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      if (sortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    }
    
    if (sortConfig.direction === 'asc') {
      return (aValue > bValue) ? 1 : -1;
    } else {
      return (aValue < bValue) ? 1 : -1;
    }
  });
};

export const filterInvoices = (
  invoices: any[],
  searchQuery: string,
  dateRange: { from?: Date; to?: Date } | undefined,
  getClientName: (clientId: string) => string,
  getJobName: (jobId: string) => string
) => {
  return invoices.filter(invoice => {
    const matchesSearch = 
      invoice.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getClientName(invoice.clientId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (getJobName(invoice.jobId) && getJobName(invoice.jobId).toLowerCase().includes(searchQuery.toLowerCase()));
    
    let matchesDateRange = true;
    if (dateRange?.from) {
      const invoiceDate = new Date(invoice.date);
      
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        matchesDateRange = invoiceDate >= fromDate && invoiceDate <= toDate;
      } else {
        matchesDateRange = invoiceDate >= fromDate;
      }
    }
    
    return matchesSearch && matchesDateRange;
  });
};
