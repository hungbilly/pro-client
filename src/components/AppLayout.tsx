
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
  
  // Reset scroll position on route changes and fix mobile scrolling
  useEffect(() => {
    // First reset scroll position
    window.scrollTo(0, 0);
    
    // Then enable scrolling for mobile devices, particularly iOS Safari
    if (isMobile) {
      document.body.style.overflow = 'auto';
      document.body.style.height = 'auto';
      document.documentElement.style.height = 'auto';
      document.body.style.position = 'static'; // Remove any fixed positioning
      document.body.style.touchAction = 'auto';
      document.documentElement.style.touchAction = 'auto';
      
      // Force redraw to apply scroll changes (needed for iOS)
      setTimeout(() => {
        window.scrollTo(0, 1);
        window.scrollTo(0, 0);
      }, 100);
    }
  }, [location.pathname, isMobile]);
  
  return (
    <div 
      className="min-h-screen flex flex-col mobile-scrollable" 
      style={{ 
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch' 
      }}
    >
      <TopNavbar />
      {isInTrialPeriod && <TrialBanner />}
      
      <div className="flex-1 mobile-scrollable">
        <Outlet />
      </div>
      
      <Footer />
    </div>
  );
};

export default AppLayout;
