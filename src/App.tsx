
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Routes from './Routes';
import { Toaster } from 'sonner';
import CompanyProvider from './context/CompanyContext';
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
          <Toaster 
            position="top-center"
            toastOptions={{
              style: {
                fontSize: '16px',
                padding: '16px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              },
              duration: 4000,
            }}
          />
          <CompanyProvider>
            <Routes />
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
