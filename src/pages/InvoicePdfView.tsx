
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const InvoicePdfView = () => {
  const { viewLink } = useParams<{ viewLink: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewLink) {
      setError("No invoice link provided");
      setLoading(false);
      return;
    }

    const redirectToStaticHtml = async () => {
      try {
        const cleanViewLink = viewLink.includes('/') 
          ? viewLink.split('/').pop() 
          : viewLink;
          
        const staticUrl = `${supabase.supabaseUrl}/functions/v1/serve-static-invoice/${cleanViewLink}`;
        console.log("Redirecting to static invoice URL:", staticUrl);
        window.location.href = staticUrl;
      } catch (err) {
        console.error("Error redirecting to static HTML:", err);
        setError("Failed to load invoice PDF");
        setLoading(false);
      }
    };

    redirectToStaticHtml();
  }, [viewLink]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading invoice...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen">Error: {error}</div>;
  }

  return null;
};

export default InvoicePdfView;
