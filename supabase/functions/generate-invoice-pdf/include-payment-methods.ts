
// This is a utility function that can be imported in generate-invoice-pdf/index.ts
// to add payment methods to the invoice PDF

export function addPaymentMethodsToTemplate(htmlTemplate: string, paymentMethods?: string): string {
  if (!paymentMethods) {
    console.log('[DEBUG] No payment methods to add');
    return htmlTemplate;
  }

  console.log('[DEBUG] Adding payment methods to template, length:', paymentMethods.length);

  // Find the payment section in the template (this is a simplified approach)
  const paymentMethodsSection = `
    <div class="payment-methods">
      <div class="label">PAYMENT METHODS</div>
      <div style="white-space: pre-line;">${paymentMethods}</div>
    </div>
  `;
  
  // Look for contract-terms div which has page-break-before
  if (htmlTemplate.includes('class="contract-terms"')) {
    // Insert payment methods before the contract terms section
    return htmlTemplate.replace('<div class="contract-terms">', `${paymentMethodsSection}<div class="contract-terms">`);
  } 
  
  // If no contract terms, add before the footer
  if (htmlTemplate.includes('class="footer"')) {
    return htmlTemplate.replace('<div class="footer">', `${paymentMethodsSection}<div class="footer">`);
  }
  
  // Fallback - insert before closing body tag
  return htmlTemplate.replace('</body>', `${paymentMethodsSection}</body>`);
}
