
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClientDetail from "./pages/ClientDetail";
import ClientNew from "./pages/ClientNew";
import ClientEdit from "./pages/ClientEdit";
import InvoiceView from "./pages/InvoiceView";
import InvoiceCreate from "./pages/InvoiceCreate";
import JobCreate from "./pages/JobCreate";
import JobEdit from "./pages/JobEdit";
import JobDetail from "./pages/JobDetail";
import Auth from "./pages/Auth";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={
                <ProtectedRoute adminOnly>
                  <Index />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/client/new" 
              element={
                <ProtectedRoute adminOnly>
                  <ClientNew />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/client/:id" 
              element={
                <ProtectedRoute adminOnly>
                  <ClientDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/client/edit/:id" 
              element={
                <ProtectedRoute adminOnly>
                  <ClientEdit />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/client/:clientId/job/create" 
              element={
                <ProtectedRoute adminOnly>
                  <JobCreate />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/client/:clientId/job/edit/:id" 
              element={
                <ProtectedRoute adminOnly>
                  <JobEdit />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/job/:id" 
              element={
                <ProtectedRoute adminOnly>
                  <JobDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/job/:jobId/invoice/create" 
              element={
                <ProtectedRoute adminOnly>
                  <InvoiceCreate />
                </ProtectedRoute>
              } 
            />
            <Route path="/invoice/:viewLink" element={<InvoiceView />} />
            <Route path="/auth" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
