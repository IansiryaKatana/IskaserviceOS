import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useIsPlatformAdmin, useUserRoles } from "@/hooks/use-user-roles";
import type { AppRole } from "@/hooks/use-user-roles";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requirePlatformAdmin?: boolean;
  requireRoles?: AppRole[];
  tenantId?: string;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requirePlatformAdmin = false,
  requireRoles,
  tenantId,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { data: isPlatformAdmin, isLoading: loadingAdmin } = useIsPlatformAdmin();
  const { data: roles, isLoading: loadingRoles } = useUserRoles();

  if (loading || loadingAdmin || loadingRoles) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-body text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  if (requirePlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireRoles && requireRoles.length > 0 && roles) {
    // Platform admins bypass role checks
    if (isPlatformAdmin) return <>{children}</>;
    
    const hasRequiredRole = requireRoles.some(reqRole =>
      roles.some(r => r.role === reqRole && (!tenantId || r.tenant_id === tenantId))
    );
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
