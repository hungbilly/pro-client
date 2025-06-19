
-- Add a proper contract_accepted_by field to separate it from invoice acceptance
ALTER TABLE public.invoices 
ADD COLUMN contract_accepted_by text;

-- Update existing records where invoice_accepted_by was used for contract acceptance
-- This moves the name from invoice_accepted_by to contract_accepted_by for records that have contract acceptance
UPDATE public.invoices 
SET contract_accepted_by = invoice_accepted_by,
    invoice_accepted_by = NULL
WHERE contract_accepted_at IS NOT NULL 
  AND invoice_accepted_by IS NOT NULL;
