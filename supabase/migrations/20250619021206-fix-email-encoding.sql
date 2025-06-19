
-- Fix email template encoding issues by updating the templates directly
UPDATE public.email_templates 
SET body = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h2 style="color: #2563eb; margin-bottom: 20px;">Great News! Your Invoice Has Been Accepted</h2>
<div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
<p style="margin: 0; font-weight: bold;">Invoice #{{invoice_number}} has been accepted by {{client_name}}</p>
</div>
<div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3 style="margin-top: 0; color: #374151;">Invoice Details:</h3>
<ul style="list-style: none; padding: 0;">
<li style="margin: 8px 0;"><strong>Invoice Number:</strong> #{{invoice_number}}</li>
<li style="margin: 8px 0;"><strong>Client:</strong> {{client_name}}</li>
<li style="margin: 8px 0;"><strong>Amount:</strong> {{invoice_amount}}</li>
<li style="margin: 8px 0;"><strong>Accepted On:</strong> {{acceptance_date}}</li>
</ul>
</div>
<p>The client has accepted the invoice and any associated contract terms. You can now proceed with the next steps in your workflow.</p>
<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
<p>This is an automated notification from {{company_name}}</p>
</div>
</div>'
WHERE name = 'invoice_accepted_notification';

UPDATE public.email_templates 
SET body = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h2 style="color: #059669; margin-bottom: 20px;">Contract Terms Accepted!</h2>
<div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
<p style="margin: 0; font-weight: bold;">{{client_name}} has accepted the contract terms for Invoice #{{invoice_number}}</p>
</div>
<div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3 style="margin-top: 0; color: #374151;">Contract Details:</h3>
<ul style="list-style: none; padding: 0;">
<li style="margin: 8px 0;"><strong>Invoice Number:</strong> #{{invoice_number}}</li>
<li style="margin: 8px 0;"><strong>Client:</strong> {{client_name}}</li>
<li style="margin: 8px 0;"><strong>Accepted By:</strong> {{accepted_by}}</li>
<li style="margin: 8px 0;"><strong>Accepted On:</strong> {{acceptance_date}}</li>
</ul>
</div>
<p>The contract terms have been formally accepted. The agreement is now in effect and you can proceed with confidence.</p>
<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
<p>This is an automated notification from {{company_name}}</p>
</div>
</div>'
WHERE name = 'contract_accepted_notification';
