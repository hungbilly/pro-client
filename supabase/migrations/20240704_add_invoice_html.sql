
-- Add a column to store the prerendered HTML content
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_html TEXT;

-- Add an index to the view_link column for faster lookup
CREATE INDEX IF NOT EXISTS invoices_view_link_idx ON invoices (view_link);

-- Add function to regenerate HTML for all invoices (can be run manually)
CREATE OR REPLACE FUNCTION regenerate_all_invoice_html()
RETURNS void AS $$
BEGIN
    -- This function is a placeholder. The actual regeneration will be handled by the application.
    -- To regenerate all HTML, you'll need to call the generateInvoiceHtml function for each invoice.
    RAISE NOTICE 'Please regenerate invoice HTML from the application instead.';
END;
$$ LANGUAGE plpgsql;
