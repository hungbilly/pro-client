
// Update the updateContractStatus function
export const updateContractStatus = async (
  invoiceId: string, 
  status: ContractStatus, 
  clientName?: string
): Promise<boolean> => {
  try {
    const updateData: { 
      contract_status: ContractStatus;
      contract_accepted_at?: string;
      invoice_accepted_by?: string;
    } = { 
      contract_status: status,
      contract_accepted_at: new Date().toISOString()
    };

    if (clientName) {
      updateData.invoice_accepted_by = clientName;
    }

    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId);

    if (error) {
      console.error('Error updating contract status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateContractStatus:', error);
    return false;
  }
};
