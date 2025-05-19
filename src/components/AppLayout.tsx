
import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import Footer from './Footer';
import TrialBanner from './TrialBanner';
import { useSubscription } from '@/context/SubscriptionContext';

const AppLayout = () => {
  const { isInTrialPeriod } = useSubscription();
  
  return (
    <div className="min-h-screen flex flex-col" style={{ touchAction: 'pan-y' }}>
      <TopNavbar />
      {isInTrialPeriod && <TrialBanner />}
      
      <div className="flex-1">
        <Outlet />
      </div>
      
      <Footer />
    </div>
  );
};

export default AppLayout;
