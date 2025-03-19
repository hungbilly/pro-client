
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Routes from './Routes';
import ToastProvider from './components/ToastProvider';
import CompanyProvider from './context/CompanyContext';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CompanyProvider>
          <Routes />
        </CompanyProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
