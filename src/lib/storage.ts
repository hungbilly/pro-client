
export const getInvoice = async (id: string): Promise<Invoice | undefined> => {
  try {
    // First get the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    
    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      return undefined;
    }
    
    // Then get the invoice items
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);
    
    if (itemsError || !itemsData) {
      console.error('Error fetching invoice items:', itemsError);
      return undefined;
    }

    // Get payment schedules
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', id);
    
    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError);
      // Continue without payment schedules
    }
    
    // Map and transform the data
    const invoiceItems = itemsData.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount
    }));

    // Map payment schedules
    const paymentSchedules: PaymentSchedule[] = (schedulesData || []).map(schedule => ({
      id: schedule.id,
      description: schedule.description || '',
      dueDate: schedule.due_date,
      percentage: schedule.percentage,
      status: parseEnum(schedule.status, ['paid', 'unpaid', 'write-off'], 'unpaid') as PaymentStatus,
      paymentDate: schedule.payment_date
    }));
    
    console.log('Payment schedules fetched:', paymentSchedules);
    
    return {
      id: invoice.id,
      clientId: invoice.client_id,
      companyId: invoice.company_id,
      jobId: invoice.job_id,
      number: invoice.number,
      amount: invoice.amount,
      date: invoice.date,
      dueDate: invoice.due_date,
      shootingDate: invoice.shooting_date,
      status: invoice.status as InvoiceStatus,
      contractStatus: invoice.contract_status as ContractStatus,
      items: invoiceItems,
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      viewLink: invoice.view_link,
      paymentSchedules: paymentSchedules.length > 0 ? paymentSchedules : undefined
    };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return undefined;
  }
};

export const getInvoiceByViewLink = async (viewLink: string): Promise<Invoice | undefined> => {
  try {
    console.log('Searching for invoice with view_link parameter:', viewLink);
    
    // Get all invoices to search more flexibly
    const { data: allInvoices, error: invoiceQueryError } = await supabase
      .from('invoices')
      .select('*');
    
    if (invoiceQueryError) {
      console.error('Error querying invoices:', invoiceQueryError);
      return undefined;
    }
    
    // Log available invoices for debugging
    console.log('Found invoices (view_links):', allInvoices?.map(inv => inv.view_link));
    
    // First try direct match
    let matchingInvoice = allInvoices?.find(inv => inv.view_link === viewLink);
    
    // If no direct match, try to match just the ID portion
    if (!matchingInvoice) {
      // Extract the ID portion if it's a full URL
      const idPortion = viewLink.includes('/invoice/') 
        ? viewLink.split('/invoice/')[1]
        : viewLink;
      
      console.log('Trying to match with ID portion:', idPortion);
      
      // Try to find by ID directly
      matchingInvoice = allInvoices?.find(inv => inv.id === idPortion);
      
      // If still not found, try to find by partial view_link match
      if (!matchingInvoice) {
        matchingInvoice = allInvoices?.find(inv => {
          if (!inv.view_link) return false;
          return inv.view_link.includes(idPortion) || 
                 (inv.view_link.includes('/invoice/') && 
                  inv.view_link.split('/invoice/')[1] === idPortion);
        });
      }
    }
    
    if (!matchingInvoice) {
      console.error('No invoice found with matching view link or ID');
      return undefined;
    }
    
    console.log('Found matching invoice:', matchingInvoice);
    
    // Get the invoice items
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', matchingInvoice.id);
    
    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      return undefined;
    }
    
    // Get payment schedules - Added this query to include payment schedules in the initial response
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', matchingInvoice.id);
    
    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError);
      // Continue without payment schedules
    } else {
      console.log('Payment schedules fetched for view link:', schedulesData);
    }
    
    // Map and transform the data
    const invoiceItems = (itemsData || []).map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount
    }));
    
    // Map payment schedules
    const paymentSchedules: PaymentSchedule[] = (schedulesData || []).map(schedule => ({
      id: schedule.id,
      description: schedule.description || '',
      dueDate: schedule.due_date,
      percentage: schedule.percentage,
      status: parseEnum(schedule.status, ['paid', 'unpaid', 'write-off'], 'unpaid') as PaymentStatus,
      paymentDate: schedule.payment_date
    }));
    
    // Properly cast the status string to the InvoiceStatus type
    const status = matchingInvoice.status as InvoiceStatus;
    
    // Handle possible undefined contractStatus
    let contractStatus: ContractStatus | undefined = undefined;
    if (matchingInvoice.contract_status) {
      contractStatus = matchingInvoice.contract_status as ContractStatus;
    }
    
    return {
      id: matchingInvoice.id,
      clientId: matchingInvoice.client_id,
      companyId: matchingInvoice.company_id,
      jobId: matchingInvoice.job_id,
      number: matchingInvoice.number,
      amount: matchingInvoice.amount,
      date: matchingInvoice.date,
      dueDate: matchingInvoice.due_date,
      shootingDate: matchingInvoice.shooting_date,
      status,
      contractStatus,
      items: invoiceItems,
      notes: matchingInvoice.notes,
      contractTerms: matchingInvoice.contract_terms,
      viewLink: matchingInvoice.view_link,
      paymentSchedules: paymentSchedules.length > 0 ? paymentSchedules : undefined
    };
  } catch (error) {
    console.error('Error in getInvoiceByViewLink:', error);
    return undefined;
  }
};

export const saveInvoice = async (invoice: Omit<Invoice, 'id' | 'viewLink'>): Promise<Invoice> => {
  try {
    // Generate a view link
    const viewLink = generateViewLink();
    
    // Start a transaction by using the Supabase client
    const { data: newInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        client_id: invoice.clientId,
        company_id: invoice.companyId,
        job_id: invoice.jobId,
        number: invoice.number,
        amount: invoice.amount,
        date: invoice.date,
        due_date: invoice.dueDate,
        shooting_date: invoice.shootingDate,
        status: invoice.status,
        contract_status: invoice.contractStatus,
        notes: invoice.notes,
        contract_terms: invoice.contractTerms,
        view_link: viewLink
      })
      .select()
      .single();
    
    if (invoiceError || !newInvoice) {
      console.error('Error saving invoice:', invoiceError);
      throw new Error(invoiceError?.message || 'Failed to save invoice');
    }

    // Save invoice items if they exist
    if (invoice.items && invoice.items.length > 0) {
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          invoice.items.map(item => ({
            invoice_id: newInvoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount
          }))
        );
      
      if (itemsError) {
        console.error('Error saving invoice items:', itemsError);
        throw new Error(itemsError.message || 'Failed to save invoice items');
      }
    }

    // Save payment schedules if they exist
    if (invoice.paymentSchedules && invoice.paymentSchedules.length > 0) {
      const { error: schedulesError } = await supabase
        .from('payment_schedules')
        .insert(
          invoice.paymentSchedules.map(schedule => ({
            invoice_id: newInvoice.id,
            description: schedule.description,
            due_date: schedule.dueDate,
            percentage: schedule.percentage,
            status: schedule.status,
            payment_date: schedule.paymentDate
          }))
        );
      
      if (schedulesError) {
        console.error('Error saving payment schedules:', schedulesError);
        throw new Error(schedulesError.message || 'Failed to save payment schedules');
      }
    }

    return {
      id: newInvoice.id,
      clientId: newInvoice.client_id,
      companyId: newInvoice.company_id,
      jobId: newInvoice.job_id,
      number: newInvoice.number,
      amount: newInvoice.amount,
      date: newInvoice.date,
      dueDate: newInvoice.due_date,
      shootingDate: newInvoice.shooting_date,
      status: newInvoice.status as InvoiceStatus,
      contractStatus: newInvoice.contract_status as ContractStatus,
      items: invoice.items || [],
      notes: newInvoice.notes,
      contractTerms: newInvoice.contract_terms,
      viewLink: newInvoice.view_link,
      paymentSchedules: invoice.paymentSchedules
    };
  } catch (error) {
    console.error('Error saving invoice:', error);
    throw error;
  }
};
