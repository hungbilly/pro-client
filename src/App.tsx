
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Routes from './Routes';
import { Toaster } from '@/components/ui/toaster';
import CompanyProvider from './context/CompanyContext';
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SubscriptionProvider from './context/SubscriptionContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <SubscriptionProvider>
            <CompanyProvider>
              <Routes />
            </CompanyProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
