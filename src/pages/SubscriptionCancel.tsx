
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';

const SubscriptionCancel = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card className="text-center border-orange-200 shadow-lg">
            <CardHeader>
              <div className="flex justify-center">
                <AlertCircle className="h-16 w-16 text-orange-500 mb-4" />
              </div>
              <CardTitle className="text-2xl">Subscription Cancelled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  You've cancelled the subscription process. No changes have been made to your account.
                </p>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-700">
                    You can subscribe anytime to get full access to all features.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center space-x-4">
              <Button onClick={() => navigate('/subscription')}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                Go to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default SubscriptionCancel;
