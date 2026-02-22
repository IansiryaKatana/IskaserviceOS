import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FeedbackProvider } from "@/hooks/use-feedback";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { TenantProvider, useTenant } from "@/hooks/use-tenant";
import { SupabaseClientProvider } from "@/integrations/supabase/supabase-context";
import { ThemeInjector } from "@/components/ThemeInjector";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TenantPage from "./pages/TenantPage";
import CancelBooking from "./pages/CancelBooking";
import Pricing from "./pages/Pricing";
import Reviews from "./pages/Reviews";
import TenantReviews from "./pages/TenantReviews";
import NotFound from "./pages/NotFound";

const Admin = lazy(() => import("./pages/Admin"));
const Platform = lazy(() => import("./pages/Platform"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Account = lazy(() => import("./pages/Account"));

const queryClient = new QueryClient();

/** Renders booking page (Index) when tenant was resolved from custom domain, otherwise the marketing Home. */
function RootRoute() {
  const { tenantLoadedByDomain, tenant, loading } = useTenant();
  if (tenantLoadedByDomain) {
    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background font-body text-sm text-muted-foreground">
          Loading...
        </div>
      );
    }
    if (tenant) {
      return <Index />;
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-body">
        <div className="text-center">
          <h1 className="mb-4 font-display text-4xl font-bold text-foreground">Business Not Found</h1>
          <p className="text-muted-foreground">No business is configured for this domain.</p>
        </div>
      </div>
    );
  }
  return <Home />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantProvider>
        <SupabaseClientProvider>
        <ThemeInjector />
        <TooltipProvider>
          <FeedbackProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/t/:slug" element={<TenantPage />} />
              <Route path="/t/:slug/cancel" element={<CancelBooking />} />
              <Route path="/t/:slug/reviews" element={<TenantReviews />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute requireAuth>
                    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Loading...</div>}>
                      <Onboarding />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAuth requireRoles={["admin", "tenant_owner", "manager", "platform_owner"]}>
                    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Loading...</div>}>
                      <Admin />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform"
                element={
                  <ProtectedRoute requireAuth requirePlatformAdmin>
                    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Loading...</div>}>
                      <Platform />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute requireAuth>
                    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Loading...</div>}>
                      <Account />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </FeedbackProvider>
        </TooltipProvider>
        </SupabaseClientProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
