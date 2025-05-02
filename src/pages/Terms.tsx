
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
            Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Pro Client service ("Service") operated by Pro Client ("us", "we", or "our").
          </p>
          <p>
            Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.
          </p>
          <p>
            By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Accounts</h2>
          <p>
            When you create an account with us, you must provide accurate, complete, and up-to-date information. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
          </p>
          <p>
            You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
          </p>
          <p>
            You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are and will remain the exclusive property of Pro Client and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
          </p>
          <p>
            Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Pro Client.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">User Content</h2>
          <p>
            Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness.
          </p>
          <p>
            By posting Content to the Service, you grant us the right and license to use, modify, perform, display, reproduce, and distribute such Content on and through the Service.
          </p>
          <p>
            You represent and warrant that: (i) the Content is yours or you have the right to use it and grant us the rights and license as provided in these Terms, and (ii) the posting of your Content on or through the Service does not violate the privacy rights, publicity rights, copyrights, contract rights or any other rights of any person.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Google API Services User Data Policy</h2>
          <p>
            Our Service integrates with Google API Services. By using our Google integration features, you agree to be bound by the Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy).
          </p>
          <p>
            We access and use information obtained through Google API Services in accordance with Google's Limited Use Requirements:
          </p>
          <ul className="list-disc ml-6 my-3">
            <li>We only request access to the data required to implement our Service's features.</li>
            <li>We do not sell user data obtained through Google API Services.</li>
            <li>We do not use user data obtained through Google API Services for advertising purposes.</li>
            <li>We do not allow humans to read user data obtained through Google API Services unless:</li>
              <ul className="list-circle ml-8 my-1">
                <li>We have your affirmative consent for specific messages</li>
                <li>It is necessary for security or compliance purposes</li>
                <li>It is needed to maintain our Service or address technical issues</li>
              </ul>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>
          <p>
            Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service.
          </p>
          <p>
            All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Disclaimer and Limitation of Liability</h2>
          <p>
            Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied.
          </p>
          <p>
            In no event shall Pro Client, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which Pro Client is established, without regard to its conflict of law provisions.
          </p>
          <p>
            Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Changes to These Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
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
