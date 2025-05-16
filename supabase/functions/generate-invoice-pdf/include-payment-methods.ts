
// This is a utility function that can be imported in generate-invoice-pdf/index.ts
// to add payment methods to the invoice PDF

export function addPaymentMethodsToTemplate(htmlTemplate: string, paymentMethods?: string): string {
  if (!paymentMethods) {
    return htmlTemplate;
  }

  // Find the payment section in the template (this is a simplified approach)
  // In a real implementation, you might need to target a specific div with an ID
  const paymentMethodsHtml = `
    <div class="payment-methods-section" style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eaeaea;">
      <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Payment Methods</h4>
      <div style="font-size: 14px; color: #666; white-space: pre-line;">
        ${paymentMethods}
      </div>
    </div>
  `;

  // Insert payment methods before the closing body tag
  return htmlTemplate.replace('</body>', `${paymentMethodsHtml}</body>`);
}
