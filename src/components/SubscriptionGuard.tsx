
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';

interface SubscriptionGuardProps {
  children?: React.ReactNode;
}

const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ children }) => {
  const { hasAccess, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-600">Checking subscription...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/subscription" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default SubscriptionGuard;
