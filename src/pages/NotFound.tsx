
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, FileText, ArrowLeft, Plus } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleGoHome = () => {
    navigate("/");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Check for common patterns that might benefit from specific actions
  const isInvoiceRoute = location.pathname.includes('/invoice/');
  const isJobInvoiceCreateRoute = location.pathname.match(/\/job\/([^\/]+)\/invoice\/create/);
  const isJobInvoiceNewRoute = location.pathname.match(/\/job\/([^\/]+)\/invoice\/new/);
  const jobId = isJobInvoiceCreateRoute ? isJobInvoiceCreateRoute[1] : 
                isJobInvoiceNewRoute ? isJobInvoiceNewRoute[1] : null;

  const handleCreateInvoice = () => {
    if (jobId) {
      // Redirect to the correct route
      navigate(`/job/${jobId}/invoice/new`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-5xl font-bold mb-4 text-gray-800">404</h1>
        <p className="text-xl text-gray-600 mb-6">
          {isInvoiceRoute ? "Invoice Not Found" : "Oops! This page doesn't exist"}
        </p>
        <p className="text-gray-500 mb-6">
          {isInvoiceRoute 
            ? "The invoice you're looking for could not be found. It may have been deleted or the link is incorrect."
            : `The page you're looking for at ${location.pathname} could not be found.`
          }
          
          {isJobInvoiceCreateRoute && (
            <span className="block mt-2 text-amber-600">
              It looks like you're trying to create an invoice for a job. 
              The correct URL should be "/job/{jobId}/invoice/new".
            </span>
          )}
        </p>
        <div className="flex flex-col space-y-2">
          <Button onClick={handleGoBack} className="px-6 w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          
          {jobId && (
            <Button onClick={handleCreateInvoice} className="px-6 w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          )}
          
          <Button onClick={handleGoHome} className="px-6 w-full">
            <Home className="mr-2 h-4 w-4" />
            Return to Home
          </Button>
          
          {isInvoiceRoute && (
            <Button onClick={() => navigate("/clients")} variant="outline" className="px-6 w-full">
              <FileText className="mr-2 h-4 w-4" />
              View All Invoices
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
