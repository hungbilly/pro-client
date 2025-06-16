
-- Create a new RLS policy for payment_schedules that allows public access
-- when the payment schedule belongs to an invoice that has a view_link (making it publicly accessible)
CREATE POLICY "Public can view payment schedules for invoices with view links"
ON public.payment_schedules
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 
    FROM public.invoices 
    WHERE invoices.id = payment_schedules.invoice_id 
    AND invoices.view_link IS NOT NULL
  )
);
