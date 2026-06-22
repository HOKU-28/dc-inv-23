"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Sun, Moon, RefreshCw } from "lucide-react";
import { Item, StockLog } from "@/app/types";
import { getItems, getItemStatus, getLogs } from "@/app/lib/data";
import { syncAll, syncItems } from "@/app/lib/sync";
import { syncExtra, pushUsers } from "@/app/lib/sync-extra";
import { isOnline } from "@/app/lib/supabase";
import { useOnlineStatus } from "@/app/hooks/use-online-status";
import { OwnerDashboard } from "@/app/components/dashboard/owner-tab";
import { getUsers, User } from "@/app/lib/auth";
import { useAuth } from "@/app/hooks/use-auth";
import { DashboardSkeleton } from "@/app/components/skeletons";
import { useTheme } from "@/app/components/theme-provider";
import { ErrorBoundary } from "@/app/components/error-boundary";
import { toast } from "sonner";

export default function OwnerDashboardPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const online = useOnlineStatus();
  const { session, loading: authLoading, logout: handleLogout } = useAuth({
    expectedRole: "owner",
  });
  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [mounted, setMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = () => {
    setItems(getItems());
    setLogs(getLogs());
  };

  const refreshUsers = () => {
    setUsers(getUsers());
  };

  useEffect(() => {
    if (authLoading || !session) return;

    const init = () => {
      refresh();
      refreshUsers();
      setMounted(true);
      setInitialLoading(false);

      if (isOnline()) {
        setIsSyncing(true);
        syncAll()
          .then(() => syncExtra())
          .then(() => {
            refresh();
            refreshUsers();
          })
          .catch((err) => console.error("[owner] initial sync failed:", err))
          .finally(() => setIsSyncing(false));
      }
    };

    init();
  }, [authLoading, session]);

  useEffect(() => {
    if (mounted && online) {
      setIsSyncing(true);
      syncAll()
        .then(() => syncExtra())
        .then(() => refresh())
        .catch((err) => console.error("[owner] sync failed:", err))
        .finally(() => setIsSyncing(false));
    }
  }, [online, mounted]);

  const statuses = useMemo(() => items.map((i) => getItemStatus(i, logs)), [items, logs]);

  const onLogout = () => {
    handleLogout();
    toast.info("Anda telah keluar dari sistem.");
  };

  if (authLoading || !mounted || initialLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background pb-8">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto w-full max-w-md px-4 py-3 sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold leading-tight">Dominico Stock</h1>
              <p className="text-xs text-muted-foreground">Ringkasan Owner</p>
            </div>
            <div className="flex items-center gap-1">
              {isSyncing && (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Sinkronisasi..." />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="h-10 w-10 text-muted-foreground"
                aria-label={resolvedTheme === "dark" ? "Mode terang" : "Mode gelap"}
              >
                {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="h-10 w-10 text-muted-foreground"
                aria-label="Keluar"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md px-4 py-4 sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
          <OwnerDashboard
            items={items}
            statuses={statuses}
            logs={logs}
            users={users}
            onItemsChange={() => {
              refresh();
              syncItems().catch((err) => console.error("[owner] syncItems failed:", err));
            }}
            onUsersChange={() => {
              refreshUsers();
              pushUsers().catch((err) => console.error("[owner] pushUsers failed:", err));
            }}
          />
        </main>
      </div>
    </ErrorBoundary>
  );
}
