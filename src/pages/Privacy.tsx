
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';

const Privacy = () => {
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
          <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last updated: May 2, 2025</p>
        </div>

        <div className="prose max-w-none">
          <p>
            Pro Client is committed to protecting your privacy. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use our service.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
          <p>
            We may collect several types of information from and about users of our Service, including:
          </p>
          <ul className="list-disc ml-6 my-3">
            <li>Personal identifiable information (such as your name, email address, telephone number)</li>
            <li>Billing and payment information</li>
            <li>Client information you choose to store in our Service</li>
            <li>Information about your business operations as they relate to our Service</li>
            <li>Technical data such as IP address, browser type, and device information</li>
            <li>Usage data about how you interact with our Service</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Collect Information</h2>
          <p>
            We collect information:
          </p>
          <ul className="list-disc ml-6 my-3">
            <li>Directly from you when you register, subscribe to our service, or use our features</li>
            <li>Automatically as you navigate through our Service (using cookies and similar technologies)</li>
            <li>From third-party sources, such as business partners, payment processors, and authentication services</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">3. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul className="list-disc ml-6 my-3">
            <li>Provide, maintain, and improve our Service</li>
            <li>Process transactions and send related information</li>
            <li>Send administrative information, such as updates, security alerts, and support messages</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Personalize your experience and deliver content relevant to your interests</li>
            <li>Monitor and analyze trends, usage, and activities in connection with our Service</li>
            <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
            <li>Protect the rights and property of Pro Client and others</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">4. Third-Party Data Processing and Sharing</h2>
          <p>
            We may share your information with:
          </p>
          <ul className="list-disc ml-6 my-3">
            <li>Service providers who perform services on our behalf</li>
            <li>Business partners with whom we jointly offer products or services</li>
            <li>Third-party authentication providers (when you choose to link accounts)</li>
            <li>Law enforcement or other governmental authorities as required by law</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">5. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information. However, no method of
            transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">6. Google API Services User Data Policy</h2>
          <p>
            Our application uses Google API Services to enhance functionality. By using our application with Google services,
            you agree to the <a href="https://developers.google.com/terms/" className="text-blue-600 hover:underline">Google API Services User Data Policy</a>,
            including the Limited Use requirements.
          </p>
          
          <p>
            Our application's use and transfer of information received from Google APIs to any other app will adhere to
            <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-600 hover:underline"> Google API Services User Data Policy</a>,
            including the Limited Use requirements.
          </p>
          
          <p>
            We only access, use, store, and share Google user data for the purposes that you consent to and that are permitted
            by the Google API Services User Data Policy. We limit our use of Google user data to providing or improving
            user-facing features that are prominent in the requesting application's user interface.
          </p>
          
          <p>
            We do not use Google user data for serving advertisements and we do not sell Google user data. Additionally,
            we do not use Google user data for purposes unrelated to improving user-facing features of the application.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">7. Data Retention</h2>
          <p>
            We retain your personal information only for as long as is necessary for the purposes set out in this Privacy
            Policy, unless a longer retention period is required or permitted by law.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">8. Your Rights and Choices</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal information, including:
          </p>
          <ul className="list-disc ml-6 my-3">
            <li>Accessing, correcting, or deleting your personal information</li>
            <li>Withdrawing consent to processing your information</li>
            <li>Restricting or objecting to certain uses of your information</li>
            <li>Requesting a portable copy of your data</li>
            <li>Opting out of certain communications from us</li>
          </ul>
          <p>
            To exercise these rights, please contact us using the information provided at the end of this policy.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">9. Children's Privacy</h2>
          <p>
            Our Service is not intended for children under the age of 16. We do not knowingly collect personal information
            from children under 16. If you are a parent or guardian and believe your child has provided us with personal
            information, please contact us.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">10. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The updated version will be effective as soon as it is
            accessible. We will notify you of material changes by posting a notice on our website or by sending you an
            email.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> privacy@proclient.com
          </p>
          <p>
            <strong>Phone:</strong> (123) 456-7890
          </p>
          <p>
            <strong>Postal Address:</strong> Pro Client Privacy Office, 123 Business Ave, Suite 456, San Francisco, CA 94107
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Privacy;
