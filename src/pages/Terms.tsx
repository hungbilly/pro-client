
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';

const Terms = () => {
  return (
    <PageTransition>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last updated: May 2, 2025</p>
        </div>

        <div className="prose max-w-none">
          <p>
            Welcome to Pro Client. These Terms of Service ("Terms") govern your access to and use of the Pro Client platform
            and any related services (collectively, the "Service"). By accessing or using the Service, you agree to be bound
            by these Terms. If you do not agree to these Terms, do not access or use the Service.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">1. Account Registration and Security</h2>
          <p>
            To use certain features of the Service, you must register for an account. When you register, you agree to provide accurate,
            current, and complete information. You are responsible for maintaining the security of your account and password.
            Pro Client cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">2. User Responsibilities</h2>
          <p>
            You are responsible for all activities that occur under your account. You agree not to:
          </p>
          <ul className="list-disc ml-6 my-3">
            <li>Use the Service for any illegal purpose or in violation of any laws</li>
            <li>Upload or transmit viruses or any other type of malicious code</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Attempt to gain unauthorized access to the Service or its related systems</li>
            <li>Use the Service to infringe upon the rights of others</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">3. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are owned by Pro Client and are protected by
            international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy,
            modify, create derivative works, publicly display, publicly perform, republish, or transmit any of the material
            from our Service without prior written consent.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">4. User Content</h2>
          <p>
            The Service allows you to post, link, store, share, and otherwise make available certain information, text, graphics,
            or other material ("User Content"). You are responsible for the User Content that you post, including its legality,
            reliability, and appropriateness. By posting User Content, you grant Pro Client the right to use, modify, publicly
            perform, publicly display, reproduce, and distribute such content on and through the Service.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">5. Subscription and Payment Terms</h2>
          <p>
            Some aspects of the Service may be provided for a fee. You agree to pay all fees associated with the Service
            in accordance with the billing terms in effect at the time the fee or charge becomes payable. If you dispute
            any charges, you must notify Pro Client within 30 days after the date of billing. Refunds (if any) are at the
            discretion of Pro Client and will only be issued in accordance with our refund policy.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">6. Third-Party Services</h2>
          <p>
            The Service may contain links to third-party websites or services that are not owned or controlled by Pro Client.
            Pro Client has no control over, and assumes no responsibility for, the content, privacy policies, or practices
            of any third-party websites or services. You acknowledge and agree that Pro Client shall not be responsible or
            liable for any damage or loss caused or alleged to be caused by or in connection with the use of or reliance on
            any such content, goods, or services available on or through any such websites or services.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">7. Google API Services and User Data</h2>
          <p>
            Our application may use Google API Services. By using our application with Google services, you agree to the 
            <a href="https://developers.google.com/terms/" className="text-blue-600 hover:underline"> Google API Services User Data Policy</a>, 
            including the Limited Use requirements. We access, use, store, and share Google user data only for the purposes 
            that you consent to and that are permitted by the Google API Services User Data Policy.
          </p>
          
          <p>
            We limit our use of Google user data to providing or improving user-facing features that are prominent in the 
            requesting application's user interface. We do not use Google user data for serving advertisements, and we do not 
            sell Google user data. Additionally, we do not use Google user data for other purposes unrelated to improving 
            user-facing features of the application.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">8. Limitation of Liability</h2>
          <p>
            In no event shall Pro Client, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable
            for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of
            profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability
            to access or use the Service.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">9. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the Service immediately, without prior notice or liability,
            for any reason whatsoever, including without limitation if you breach these Terms. Upon termination, your right
            to use the Service will immediately cease.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">10. Changes to These Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms at any time. If a revision is material we will provide at
            least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined
            at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree
            to be bound by the revised terms.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> terms@proclient.com
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Terms;
