
import React from 'react';
import { Toaster } from 'sonner';

const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        className: "my-toast-class",
      }}
    />
  );
};

export default ToastProvider;
