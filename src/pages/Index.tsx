
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
        <img 
          src="/lovable-uploads/0d307c1b-40a3-4803-bddc-725d45fa24a9.png" 
          alt="ProClient Logo" 
          className="h-12 w-auto"
        />
        <div className="flex gap-4">
          <Button variant="ghost" onClick={() => navigate('/auth')}>Log in</Button>
          <Button onClick={() => navigate('/auth')}>Sign up</Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Column - Content */}
        <div className="space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Professional Client Management System
            <span className="block text-primary mt-2">for Service-Based Businesses</span>
          </h1>
          
          <p className="text-xl text-gray-600">
            Streamline your workflow, manage clients effortlessly, and grow your business with our comprehensive management solution.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-lg">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="text-lg">
              Learn More
            </Button>
          </div>

          <div className="pt-8">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <span className="text-green-500">✓</span> No credit card required
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <span className="text-green-500">✓</span> 30-day free trial
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <span className="text-green-500">✓</span> Cancel anytime
            </p>
          </div>
        </div>

        {/* Right Column - Video Placeholder */}
        <div className="rounded-xl bg-white p-4 shadow-xl">
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Video demo coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
