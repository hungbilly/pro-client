
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Routes from './Routes';
import { Toaster } from './components/ui/toaster';
import CompanyProvider from './context/CompanyContext';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster />
        <CompanyProvider>
          <Routes />
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
