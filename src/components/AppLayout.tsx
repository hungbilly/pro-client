
import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import Footer from './Footer';
import TrialBanner from './TrialBanner';
import { useSubscription } from '@/context/SubscriptionContext';
import { useIsMobile } from '@/hooks/use-mobile';

const AppLayout = () => {
  const { isInTrialPeriod } = useSubscription();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Reset scroll position on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
    
    if (isMobile) {
      // Ensure iOS Safari has proper scrolling permissions
      document.body.style.overflow = 'auto';
      document.body.style.height = 'auto';
      document.documentElement.style.height = 'auto';
      document.body.style.touchAction = 'auto';
    }
  }, [location.pathname, isMobile]);
  
  return (
    <div 
      className="min-h-screen flex flex-col" 
      style={{ 
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch' 
      }}
    >
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
