import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, FileText, ArrowLeft, Briefcase } from "lucide-react";

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

  // Check if this is likely an invoice route
  const isInvoiceRoute = location.pathname.includes('/invoice/');
  // Check if this is likely a job route
  const isJobRoute = location.pathname.includes('/job/');
  // Check if this is a client route
  const isClientRoute = location.pathname.includes('/client/');

  // Check if this is a route with "create" in it that we can fix
  const isCreateRouteWithIssue = location.pathname.includes('/create');
  
  // Check if this is a client edit route with wrong format
  const isClientEditRouteWithIssue = location.pathname.includes('/client/edit/');
  
  // Extract the client ID if present
  const clientIdMatch = location.pathname.match(/\/client\/([^\/]+)/);
  const clientId = clientIdMatch ? clientIdMatch[1] : null;
  
  // Extract client ID from edit route if in the wrong format
  const editClientIdMatch = location.pathname.match(/\/client\/edit\/([^\/]+)/);
  const editClientId = editClientIdMatch ? editClientIdMatch[1] : null;
  
  // Extract the job ID if present
  const jobIdMatch = location.pathname.match(/\/job\/([^\/]+)/);
  const jobId = jobIdMatch ? jobIdMatch[1] : null;

  // Check if this is a PDF view route with an incorrect URL format
  const isPdfViewWithFullUrl = isInvoiceRoute && 
    location.pathname.includes('/pdf/') && 
    location.pathname.includes('https://');
  
  // Fix for malformed PDF URL (containing full URL instead of just the view link ID)
  const fixPdfUrl = () => {
    if (isPdfViewWithFullUrl) {
      const fullPath = location.pathname;
      const urlParts = fullPath.split('/');
      // Find the last part which should be the view link ID
      const lastPart = urlParts[urlParts.length - 1];
      if (lastPart && lastPart.includes('/')) {
        // Extract just the ID from the full URL
        const viewLinkId = lastPart.split('/').pop();
        if (viewLinkId) {
          return `/invoice/pdf/${viewLinkId}`;
        }
      }
    }
    return null;
  };

  // Determine correct route for common mistakes
  const getCorrectRoute = () => {
    if (isClientEditRouteWithIssue && editClientId) {
      return `/client/${editClientId}/edit`;
    }
    
    if (isCreateRouteWithIssue) {
      // Replace /create with /new which is our standard format
      if (location.pathname.includes('/job/create') && clientId) {
        return `/client/${clientId}/job/new`;
      }
      if (location.pathname.includes('/invoice/create') && jobId) {
        return `/job/${jobId}/invoice/new`;
      }
      if (location.pathname.includes('/invoice/create') && clientId) {
        return `/client/${clientId}/invoice/new`;
      }
    }
    return null;
  };

  const correctRoute = isPdfViewWithFullUrl ? fixPdfUrl() : getCorrectRoute();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-5xl font-bold mb-4 text-gray-800">404</h1>
        <p className="text-xl text-gray-600 mb-6">
          {isInvoiceRoute ? "Invoice Not Found" : 
           isJobRoute ? "Job Not Found" : 
           "Oops! This page doesn't exist"}
        </p>
        <p className="text-gray-500 mb-6">
          {isPdfViewWithFullUrl
            ? "It looks like the invoice PDF URL is malformed. It might contain a full URL instead of just the view link ID."
            : isInvoiceRoute 
              ? "The invoice you're looking for could not be found. It may have been deleted or the link is incorrect."
              : isJobRoute
              ? "The job you're looking for could not be found. It may have been deleted or the link is incorrect."
              : isClientEditRouteWithIssue
              ? "It looks like you're trying to edit a client, but the URL format is incorrect."
              : `The page you're looking for at ${location.pathname} could not be found.`
          }
          {correctRoute && (
            <span className="block mt-2 text-blue-500">
              {isPdfViewWithFullUrl 
                ? "We can try to fix this URL for you."
                : isClientEditRouteWithIssue 
                  ? "The correct URL format is /client/[id]/edit"
                  : "Did you mean to go to the new page instead of create?"}
            </span>
          )}
        </p>
        <div className="flex flex-col space-y-2">
          {correctRoute && (
            <Button onClick={() => navigate(correctRoute)} className="px-6 w-full bg-blue-500 hover:bg-blue-600">
              {isPdfViewWithFullUrl ? "Go to Corrected PDF URL" : "Go to Correct Page"}
            </Button>
          )}
          
          <Button onClick={handleGoBack} className="px-6 w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          
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
          
          {isJobRoute && (
            <Button onClick={() => navigate("/jobs")} variant="outline" className="px-6 w-full">
              <Briefcase className="mr-2 h-4 w-4" />
              View All Jobs
            </Button>
          )}
          
          {isClientRoute && clientId && !isClientEditRouteWithIssue && (
            <Button onClick={() => navigate(`/client/${clientId}`)} variant="outline" className="px-6 w-full">
              <FileText className="mr-2 h-4 w-4" />
              View Client Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
