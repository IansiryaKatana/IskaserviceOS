import * as React from "react";
import { PanelLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

export interface DashboardNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  /** Brand: logo or title shown in sidebar header */
  brand: React.ReactNode;
  /** Header right: tenant switcher + role badge (shown on far right of top bar) */
  headerRight?: React.ReactNode;
  /** Nav items (flat list; no sub-menus in this version) */
  navItems: DashboardNavItem[];
  /** Currently active nav key */
  activeKey: string;
  /** Called when user selects a nav item */
  onNavSelect: (key: string) => void;
  /** Footer content (e.g. logout button, user info) */
  footer: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Optional top bar content inside main area (e.g. breadcrumb, actions) */
  topBar?: React.ReactNode;
  /** Optional class for main content wrapper */
  className?: string;
}

export function DashboardLayout({
  brand,
  headerRight,
  navItems,
  activeKey,
  onNavSelect,
  footer,
  children,
  topBar,
  className,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true} className="font-body">
      <Sidebar side="left" variant="sidebar" collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex min-h-12 min-w-0 items-center gap-2 overflow-hidden px-2 py-2">
            {brand}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-2">
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={activeKey === item.key}
                      onClick={() => onNavSelect(item.key)}
                      className="cursor-pointer px-3 py-2.5 data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:font-semibold data-[active=true]:ring-1 data-[active=true]:ring-primary/30"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="mt-auto border-t border-sidebar-border pt-2">
          {footer}
        </SidebarFooter>
      </Sidebar>
      <SidebarRail />
      <SidebarInset className="bg-sidebar">
        <DashboardTopBar topBar={topBar} headerRight={headerRight} />
        <div className={cn("flex flex-1 flex-col overflow-hidden bg-sidebar", className)}>
          <div className="flex flex-1 min-h-0 flex-col overflow-auto p-4 md:p-6">
            <div className="min-h-full flex-1 flex flex-col rounded-xl bg-background overflow-auto">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function DashboardTopBar({ topBar, headerRight }: { topBar?: React.ReactNode; headerRight?: React.ReactNode }) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <header className="sticky top-0 z-20 flex shrink-0 items-center gap-2 px-4 py-2 md:px-6">
      {isMobile ? (
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="flex items-center justify-center rounded-md p-2 text-foreground hover:bg-secondary"
          aria-label="Open menu"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      ) : (
        <SidebarTrigger className="h-8 w-8 shrink-0" aria-label="Toggle sidebar" />
      )}
      {topBar}
      <div className="flex flex-1 min-w-0" />
      {headerRight != null && (
        <div className="flex shrink-0 items-center gap-2">{headerRight}</div>
      )}
    </header>
  );
}
