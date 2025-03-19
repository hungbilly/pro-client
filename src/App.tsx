
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Routes from './Routes';
import { Toaster } from './components/ui/toaster';
import CompanyProvider from './context/CompanyContext';

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <CompanyProvider>
        <Routes />
      </CompanyProvider>
    </BrowserRouter>
  );
}

export default App;
