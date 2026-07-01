import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  Megaphone,
  User,
  Settings,
  Wrench,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/constants";

type NavItem = { to: string; label: string; icon: React.ElementType };

const residentNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/complaints/new", label: "Raise Complaint", icon: PlusCircle },
  { to: "/complaints", label: "My Complaints", icon: ListChecks },
  { to: "/notices", label: "Notice Board", icon: Megaphone },
  { to: "/profile", label: "Profile", icon: User },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/complaints", label: "Complaints", icon: ListChecks },
  { to: "/admin/notices", label: "Notices", icon: Megaphone },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: User },
];

export function AppShell({
  role,
  fullName,
  email,
  children,
}: {
  role: AppRole;
  fullName: string;
  email: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const nav = role === "admin" ? adminNav : residentNav;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const isActive = (to: string) =>
    to === "/admin" || to === "/dashboard" ? pathname === to : pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <Link to="/" className="flex items-center gap-2 font-bold text-foreground">
          <Wrench className="h-5 w-5 text-primary" /> SocietyCare
        </Link>
        <button aria-label="Toggle menu" onClick={() => setOpen((v) => !v)} className="rounded-md p-2 hover:bg-muted">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 flex-col border-r bg-sidebar px-4 py-6 transition-transform md:static md:flex md:translate-x-0",
            open ? "flex translate-x-0" : "hidden -translate-x-full",
          )}
        >
          <Link to="/" className="mb-8 hidden items-center gap-2 px-2 text-lg font-bold text-sidebar-foreground md:flex">
            <Wrench className="h-6 w-6 text-primary" /> SocietyCare
          </Link>

          <div className="mb-6 flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {(fullName || email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{fullName || "Member"}</p>
              <p className="flex items-center gap-1 text-xs capitalize text-muted-foreground">
                {role === "admin" && <ShieldCheck className="h-3 w-3 text-primary" />}
                {role}
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.to)
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleSignOut}
            className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </aside>

        {open && (
          <div className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setOpen(false)} />
        )}

        <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
