
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
            This Privacy Policy describes how Pro Client ("we", "us", or "our") collects, uses, and discloses your personal information when you use our service (the "Service"), and informs you about your privacy rights and how the law protects you.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Information We Collect</h2>
          
          <h3 className="font-semibold mt-4 mb-2">Personal Data</h3>
          <p>
            While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personal Data may include, but is not limited to:
          </p>
          <ul className="list-disc ml-6 my-3">
            <li>Email address</li>
            <li>First name and last name</li>
            <li>Phone number</li>
            <li>Business address</li>
            <li>Usage data</li>
          </ul>

          <h3 className="font-semibold mt-4 mb-2">Usage Data</h3>
          <p>
            We may also collect information on how the Service is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Use of Data</h2>
          <p>Pro Client uses the collected data for various purposes:</p>
          <ul className="list-disc ml-6 my-3">
            <li>To provide and maintain our Service</li>
            <li>To notify you about changes to our Service</li>
            <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
            <li>To provide customer support</li>
            <li>To gather analysis or valuable information so that we can improve our Service</li>
            <li>To monitor the usage of our Service</li>
            <li>To detect, prevent and address technical issues</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">Data Security</h2>
          <p>
            The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Third-Party Services</h2>
          <p>
            Our Service may contain links to other sites that are not operated by us. If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit.
          </p>
          <p>
            We have no control over and assume no responsibility for the content, privacy policies or practices of any third-party sites or services.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Google OAuth and Data Processing</h2>
          <p>
            Our Service uses Google OAuth for authentication and may access certain Google services on your behalf with your consent. We only request the minimum necessary permissions to provide the functionality you request.
          </p>
          <p>
            When you connect your Google account to our Service, we may collect:
          </p>
          <ul className="list-disc ml-6 my-3">
            <li>Your Google account email address (for account identification)</li>
            <li>Calendar data (if you choose to enable the calendar integration feature)</li>
          </ul>
          <p>
            We do not sell your Google account data or use it for advertising purposes. We only use this data to provide the specific functionality you request, such as scheduling events in your calendar.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
          <p>
            You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> privacy@proclient.com
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Privacy;
