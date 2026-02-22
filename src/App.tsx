import { lazy, Suspense, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FeedbackProvider } from "@/hooks/use-feedback";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { TenantProvider, useTenant } from "@/hooks/use-tenant";
import { SupabaseClientProvider } from "@/integrations/supabase/supabase-context";
import { ThemeInjector } from "@/components/ThemeInjector";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageTransition } from "@/components/PageTransition";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";
import { TenantPageSkeleton } from "@/components/TenantPageSkeleton";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TenantPage from "./pages/TenantPage";
import CancelBooking from "./pages/CancelBooking";
import Pricing from "./pages/Pricing";
import Reviews from "./pages/Reviews";
import TenantReviews from "./pages/TenantReviews";
import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";

const Admin = lazy(() => import("./pages/Admin"));
const Platform = lazy(() => import("./pages/Platform"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Account = lazy(() => import("./pages/Account"));

const queryClient = new QueryClient();

/** Syncs current pathname to TenantProvider so /t/:slug vs /admin tenant resolution stays correct on client-side nav. */
function TenantPathnameSync() {
  const location = useLocation();
  const { setPathname } = useTenant();
  useEffect(() => {
    setPathname(location.pathname);
  }, [location.pathname, setPathname]);
  return null;
}

/** Renders booking page (Index) when tenant was resolved from custom domain, otherwise the marketing Home. */
function RootRoute() {
  const { tenantLoadedByDomain, tenant, loading } = useTenant();
  if (tenantLoadedByDomain) {
    if (loading) {
      return <TenantPageSkeleton />;
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
            <TenantPathnameSync />
            <AnimatedRoutes>
              <Route path="/" element={<PageTransition><RootRoute /></PageTransition>} />
              <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
              <Route path="/reviews" element={<PageTransition><Reviews /></PageTransition>} />
              <Route path="/t/:slug" element={<PageTransition><TenantPage /></PageTransition>} />
              <Route path="/t/:slug/cancel" element={<PageTransition><CancelBooking /></PageTransition>} />
              <Route path="/t/:slug/reviews" element={<PageTransition><TenantReviews /></PageTransition>} />
              <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
              <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
              <Route path="/docs" element={<PageTransition><Documentation /></PageTransition>} />
              <Route
                path="/onboarding"
                element={
                  <PageTransition>
                    <ProtectedRoute requireAuth>
                      <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Loading...</div>}>
                        <Onboarding />
                      </Suspense>
                    </ProtectedRoute>
                  </PageTransition>
                }
              />
              <Route
                path="/admin"
                element={
                  <PageTransition>
                    <ProtectedRoute requireAuth requireRoles={["admin", "tenant_owner", "manager", "platform_owner"]}>
                      <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Loading...</div>}>
                        <Admin />
                      </Suspense>
                    </ProtectedRoute>
                  </PageTransition>
                }
              />
              <Route
                path="/platform"
                element={
                  <PageTransition>
                    <ProtectedRoute requireAuth requirePlatformAdmin>
                      <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Loading...</div>}>
                        <Platform />
                      </Suspense>
                    </ProtectedRoute>
                  </PageTransition>
                }
              />
              <Route
                path="/account"
                element={
                  <PageTransition>
                    <ProtectedRoute requireAuth>
                      <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Loading...</div>}>
                        <Account />
                      </Suspense>
                    </ProtectedRoute>
                  </PageTransition>
                }
              />
              <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
            </AnimatedRoutes>
          </BrowserRouter>
          </FeedbackProvider>
        </TooltipProvider>
        </SupabaseClientProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
