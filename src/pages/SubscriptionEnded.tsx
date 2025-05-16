
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, Calendar, Zap, Award, HeartHandshake } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import PageTransition from '@/components/ui-custom/PageTransition';

const SubscriptionEnded = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    subscription, 
    isInTrialPeriod, 
    trialDaysLeft, 
    trialEndDate, 
    createSubscription,
    isLoading
  } = useSubscription();
  
  const [isSubscribing, setIsSubscribing] = useState(false);
  
  const handleSubscribe = async () => {
    try {
      setIsSubscribing(true);
      const url = await createSubscription(true);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        variant: "destructive",
        title: "Subscription Error",
        description: "Failed to create subscription. Please try again.",
      });
    } finally {
      setIsSubscribing(false);
    }
  };
  
  const getStatusMessage = () => {
    if (subscription) {
      if (subscription.status === 'canceled') {
        return "Your subscription has ended. Reactivate now to continue growing your business!";
      } else if (subscription.status === 'inactive' || subscription.status === 'incomplete' || subscription.status === 'incomplete_expired') {
        return "Your subscription needs to be reactivated to unlock all premium features.";
      } else if (subscription.status === 'past_due') {
        return "Your subscription payment is past due. Update your payment method to continue.";
      } else {
        return "Your subscription requires attention to keep your business running smoothly.";
      }
    } else if (trialEndDate) {
      // Trial has ended
      const formattedDate = format(new Date(trialEndDate), 'MMMM d, yyyy');
      return `Your free trial ended on ${formattedDate}. Subscribe now to continue your journey.`;
    } else {
      return "Unlock the full potential of Wedding Studio Manager with a subscription.";
    }
  };

  const features = [
    { icon: <CheckCircle className="h-5 w-5" />, title: "Client Management", description: "Organize and track all your clients in one place" },
    { icon: <Zap className="h-5 w-5" />, title: "Invoice Creation", description: "Create professional invoices in seconds" },
    { icon: <Calendar className="h-5 w-5" />, title: "Job Scheduling", description: "Never miss an appointment or session" },
    { icon: <Award className="h-5 w-5" />, title: "Unlimited Storage", description: "Store all your photos and documents" },
    { icon: <HeartHandshake className="h-5 w-5" />, title: "Client Portal", description: "Give clients access to their photos and information" }
  ];

  const benefits = [
    "Take your photography business to the next level",
    "Save 10+ hours per week on administrative tasks",
    "Increase your bookings by 30% with professional systems",
    "No long-term contracts - cancel anytime",
    "Dedicated support team to help you succeed"
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background py-12">
        <div className="container max-w-6xl px-4">
          <div className="text-center mb-10 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Unlock Your Full Business Potential
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {getStatusMessage()}
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3 mb-12">
            <Card className="md:col-span-2 border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-2xl">What You're Missing</CardTitle>
              </CardHeader>
              
              <CardContent className="pt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-card hover:bg-primary/5 transition-colors">
                      <div className="mt-0.5 text-primary">{feature.icon}</div>
                      <div>
                        <h3 className="font-medium text-lg">{feature.title}</h3>
                        <p className="text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-primary text-primary-foreground border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Wedding Studio Manager</CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="text-4xl font-bold mb-2">$7<span className="text-lg font-normal">/month</span></div>
                <p className="opacity-90 mb-6">Billed monthly, cancel anytime</p>
                
                <div className="space-y-3">
                  <div className="font-medium">Includes:</div>
                  <ul className="space-y-2">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 flex-shrink-0">✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4 pt-2 pb-6">
                <Button 
                  className="w-full bg-white text-primary hover:bg-white/90" 
                  onClick={handleSubscribe} 
                  disabled={isSubscribing || isLoading}
                  size="lg"
                >
                  {(isSubscribing || isLoading) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Start Your 30-Day Free Trial'
                  )}
                </Button>
                
                <p className="text-xs text-center opacity-80">
                  No credit card required for trial. Cancel anytime.
                </p>
              </CardFooter>
            </Card>
          </div>
          
          <div className="bg-card border rounded-lg p-6 md:p-8 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold mb-4 text-center">What Our Photographers Say</h2>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border border-border rounded-lg p-4 bg-background">
                <div className="flex items-center gap-2 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-4 w-4 fill-primary" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm">"I've increased my bookings by 40% after organizing my workflow with Wedding Studio Manager. The client portal is a game-changer!"</p>
                <p className="text-xs text-muted-foreground mt-2">— Sarah K., Wedding Photographer</p>
              </div>
              
              <div className="border border-border rounded-lg p-4 bg-background">
                <div className="flex items-center gap-2 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-4 w-4 fill-primary" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm">"The invoicing system alone saved me hours every week. My clients are impressed with how professional everything looks."</p>
                <p className="text-xs text-muted-foreground mt-2">— Michael T., Portrait Photographer</p>
              </div>
            </div>
            
            <div className="text-center mt-6">
              <Button 
                variant="outline" 
                className="w-full md:w-auto" 
                onClick={() => navigate('/subscription')}
              >
                Compare Plans
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default SubscriptionEnded;
