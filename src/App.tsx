import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { TenantProvider } from "@/hooks/use-tenant";
import { ThemeInjector } from "@/components/ThemeInjector";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Platform from "./pages/Platform";
import Account from "./pages/Account";
import TenantPage from "./pages/TenantPage";
import Pricing from "./pages/Pricing";
import Reviews from "./pages/Reviews";
import TenantReviews from "./pages/TenantReviews";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TenantProvider>
      <AuthProvider>
        <ThemeInjector />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/t/:slug" element={<TenantPage />} />
              <Route path="/t/:slug/reviews" element={<TenantReviews />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAuth requireRoles={["admin", "tenant_owner", "manager", "platform_owner"]}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform"
                element={
                  <ProtectedRoute requireAuth requirePlatformAdmin>
                    <Platform />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute requireAuth>
                    <Account />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </TenantProvider>
  </QueryClientProvider>
);

export default App;
