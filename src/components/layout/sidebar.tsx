"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
  KeyRound,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { logout } from "@/actions/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { href: "/customers", label: "Customers", icon: Users, enabled: true },
  { href: "/services", label: "Services", icon: Wrench, enabled: true },
  { href: "/invoices", label: "Invoices", icon: FileText, enabled: true },
  { href: "/payments", label: "Payments", icon: Wallet, enabled: true },
  { href: "/expenses", label: "Expenses", icon: Receipt, enabled: true },
  { href: "/reports", label: "Reports", icon: BarChart3, enabled: true },
  { href: "/settings", label: "Settings", icon: Settings, enabled: true },
];

const COLLAPSE_KEY = "aceone-sidebar-collapsed";

function NavLinks({ onNavigate, iconOnly = false }: { onNavigate?: () => void; iconOnly?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex-1 space-y-1 p-3", iconOnly && "flex flex-col items-center px-2")}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);

        if (!item.enabled) {
          return iconOnly ? (
            <div
              key={item.href}
              title={`${item.label} (Soon)`}
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground/60"
            >
              <Icon className="size-4" />
            </div>
          ) : (
            <div
              key={item.href}
              className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4" />
                {item.label}
              </span>
              <Badge variant="outline" className="text-[10px]">
                Soon
              </Badge>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={iconOnly ? item.label : undefined}
            aria-label={iconOnly ? item.label : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              iconOnly ? "size-9 justify-center" : "px-3 py-2",
              active && "bg-accent text-accent-foreground"
            )}
          >
            <Icon className="size-4" />
            {iconOnly ? null : item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountFooter({
  userEmail,
  onNavigate,
  iconOnly = false,
}: {
  userEmail: string;
  onNavigate?: () => void;
  iconOnly?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (iconOnly) {
    return (
      <div className="flex flex-col items-center gap-1 border-t p-2">
        <Link
          href="/account"
          onClick={onNavigate}
          title="Change Password"
          aria-label="Change Password"
          className="flex size-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
        >
          <KeyRound className="size-4" />
        </Link>
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="ghost" size="icon" aria-label="Logout" title="Logout" />}
          >
            <LogOut className="size-4" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log out?</AlertDialogTitle>
              <AlertDialogDescription>You will need to sign in again to access the finance system.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={isPending} onClick={() => startTransition(() => logout())}>
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t p-3">
      <p className="truncate px-2 text-xs text-muted-foreground" title={userEmail}>
        {userEmail}
      </p>
      <Link
        href="/account"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        <KeyRound className="size-4" />
        Change Password
      </Link>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" />}>
          <LogOut className="size-4" />
          Logout
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>You will need to sign in again to access the finance system.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={() => startTransition(() => logout())}>
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a persisted preference on mount, not a derived/synced value
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // localStorage unavailable (private browsing, etc.) — default to expanded.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore — collapse preference just won't persist this session
      }
      return next;
    });
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b bg-sidebar px-4 md:hidden">
        <Image src="/logo-color.png" alt="AceOne Creative Agency" width={110} height={40} className="h-auto w-28" />
        <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
          <Menu className="size-5" />
        </Button>
      </div>

      {/* Mobile off-canvas drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[80vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <Image src="/logo-color.png" alt="AceOne Creative Agency" width={110} height={40} className="h-auto w-28" />
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <AccountFooter userEmail={userEmail} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      {collapsed ? (
        <aside className="hidden w-16 shrink-0 flex-col items-center border-r bg-sidebar text-sidebar-foreground md:flex">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="group relative flex h-16 w-full items-center justify-center border-b"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer doesn't handle .ico */}
            <img src="/favicon.ico" alt="AceOne Creative Agency" width={28} height={28} className="size-7 group-hover:opacity-0" />
            <PanelLeftOpen className="absolute size-4 opacity-0 group-hover:opacity-100" />
          </button>
          <NavLinks iconOnly />
          <AccountFooter userEmail={userEmail} iconOnly />
        </aside>
      ) : (
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
          <div className="flex h-16 items-center justify-between border-b px-5">
            <Image src="/logo-color.png" alt="AceOne Creative Agency" width={131} height={48} className="h-auto w-32" />
            <Button variant="ghost" size="icon" aria-label="Collapse sidebar" onClick={toggleCollapsed}>
              <PanelLeftClose className="size-4" />
            </Button>
          </div>
          <NavLinks />
          <AccountFooter userEmail={userEmail} />
        </aside>
      )}
    </>
  );
}
