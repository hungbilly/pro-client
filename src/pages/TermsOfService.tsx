
import React from 'react';
import { Link } from 'react-router-dom';
import PageTransition from '@/components/ui-custom/PageTransition';

const TermsOfService = () => {
  return (
    <PageTransition>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="mb-4">Last updated: April 14, 2025</p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p>
            These Terms of Service ("Terms") govern your access to and use of Pro Client's website, mobile application, and services ("Services"). Please read these Terms carefully before using our Services.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">2. Acceptance of Terms</h2>
          <p>
            By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use the Services.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">3. Changes to Terms</h2>
          <p>
            We may modify the Terms at any time, in our sole discretion. If we do so, we'll let you know either by posting the modified Terms on the Site or through other communications. It's important that you review the Terms whenever we modify them because if you continue to use the Services after we have posted modified Terms on the Site, you are indicating to us that you agree to be bound by the modified Terms.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">4. Account Registration</h2>
          <p>
            To use certain features of our Services, you may be required to create an account and provide certain information about yourself. You are responsible for maintaining the confidentiality of your account password and for all activities that occur under your account.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">5. User Content</h2>
          <p>
            Our Services allow you to create, store, and share content such as company information, client details, invoices, and other materials ("User Content"). You retain all rights in, and are solely responsible for, the User Content you create, upload, post, or otherwise make available through our Services.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">6. Subscription and Payments</h2>
          <p>
            Some of our Services require payment of fees. By subscribing to our paid Services, you agree to pay the specified subscription fees. We may change our fees at any time by posting the changed fees on the Site or by notifying you directly.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">7. Disclaimers</h2>
          <p>
            THE SERVICES AND CONTENT ARE PROVIDED "AS IS," WITHOUT WARRANTY OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">8. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICES.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">9. Indemnification</h2>
          <p>
            You agree to defend, indemnify and hold harmless Pro Client and its officers, directors, employees and agents, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses arising from your use of the Services.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">10. Governing Law</h2>
          <p>
            These Terms shall be governed by the laws of the State of California, without respect to its conflict of laws principles. Any claim or dispute between you and Pro Client that arises in whole or in part from the Services shall be decided exclusively by a court of competent jurisdiction located in San Francisco County, California.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">11. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
            <br />
            Email: legal@proclient.com
            <br />
            Address: 123 Business Avenue, Suite 456, San Francisco, CA 94107
          </p>
          
          <div className="mt-8 border-t pt-4">
            <Link to="/privacy" className="text-primary hover:underline">
              View our Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default TermsOfService;
