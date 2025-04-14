
import React from 'react';
import { Link } from 'react-router-dom';
import PageTransition from '@/components/ui-custom/PageTransition';

const PrivacyPolicy = () => {
  return (
    <PageTransition>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="mb-4">Last updated: April 14, 2025</p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p>
            Welcome to Pro Client ("we," "our," or "us"). We are committed to protecting your privacy and handling your data in an open and transparent manner. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
          <p>We collect several types of information from and about users of our platform, including:</p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Personal identifiable information such as name, email address, and contact details</li>
            <li>Company information and business details</li>
            <li>Client information that you choose to store on our platform</li>
            <li>Invoice and payment records</li>
            <li>Usage data and analytics information</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send administrative information, such as updates, security alerts, and support messages</li>
            <li>Respond to customer service requests and support needs</li>
            <li>Personalize your experience and deliver content and product features relevant to your interests</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Sharing and Disclosure</h2>
          <p>We may share your information with:</p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Service providers who perform services on our behalf</li>
            <li>Business partners with whom we jointly offer products or services</li>
            <li>Legal authorities when required by law or to protect our rights</li>
            <li>In connection with a business transaction such as a merger or acquisition</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect the security of your personal information. However, please be aware that no method of transmission over the Internet or method of electronic storage is 100% secure.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">6. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Access your personal data</li>
            <li>Correct inaccurate personal data</li>
            <li>Delete your personal data</li>
            <li>Object to the processing of your personal data</li>
            <li>Request the restriction of processing of your personal data</li>
            <li>Request the transfer of your personal data</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">7. Children's Privacy</h2>
          <p>
            Our services are not intended for use by children under the age of 16, and we do not knowingly collect personal information from children under 16.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">8. Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
          </p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">9. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
            <br />
            Email: privacy@proclient.com
            <br />
            Address: 123 Business Avenue, Suite 456, San Francisco, CA 94107
          </p>
          
          <div className="mt-8 border-t pt-4">
            <Link to="/terms" className="text-primary hover:underline">
              View our Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default PrivacyPolicy;
