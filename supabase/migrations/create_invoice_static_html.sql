
-- Create the invoice_static_html table if it doesn't exist already
CREATE TABLE IF NOT EXISTS public.invoice_static_html (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  html_content TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create an index on invoice_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_static_html_invoice_id ON public.invoice_static_html(invoice_id);

-- Add comment to the table
COMMENT ON TABLE public.invoice_static_html IS 'Stores static HTML versions of invoices for public viewing';
