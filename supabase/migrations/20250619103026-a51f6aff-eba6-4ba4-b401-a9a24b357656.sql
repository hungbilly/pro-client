
-- Add amount column to payment_schedules table
ALTER TABLE public.payment_schedules 
ADD COLUMN amount NUMERIC;

-- Update existing records to calculate amount from percentage and invoice amount
UPDATE public.payment_schedules 
SET amount = (
  SELECT (payment_schedules.percentage / 100) * invoices.amount 
  FROM invoices 
  WHERE invoices.id = payment_schedules.invoice_id
)
WHERE amount IS NULL;

-- Make amount column required after populating existing data
ALTER TABLE public.payment_schedules 
ALTER COLUMN amount SET NOT NULL;

-- Make percentage column nullable since it will become a calculated field
ALTER TABLE public.payment_schedules 
ALTER COLUMN percentage DROP NOT NULL;
