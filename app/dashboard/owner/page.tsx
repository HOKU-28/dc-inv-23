"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Sun, Moon } from "lucide-react";
import { Item, StockLog } from "@/app/types";
import { getItems, getItemStatus, getLogs } from "@/app/lib/data";
import { OwnerDashboard } from "@/app/components/dashboard/owner-tab";
import { logout, requireAuth, getUsers, User } from "@/app/lib/auth";
import { DashboardSkeleton } from "@/app/components/skeletons";
import { useTheme } from "@/app/components/theme-provider";
import { ErrorBoundary } from "@/app/components/error-boundary";
import { toast } from "sonner";

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [mounted, setMounted] = useState(false);

  const refresh = () => {
    setItems(getItems());
    setLogs(getLogs());
  };

  const refreshUsers = () => {
    setUsers(getUsers());
  };

  useEffect(() => {
    const session = requireAuth("owner");
    if (!session) {
      router.replace("/");
      return;
    }
    setMounted(true);
    refresh();
    refreshUsers();
  }, [router]);

  const statuses = useMemo(() => items.map((i) => getItemStatus(i, logs)), [items, logs]);

  const handleLogout = () => {
    logout();
    toast.info("Anda telah keluar dari sistem.");
    router.replace("/");
  };

  if (!mounted) {
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
                onClick={handleLogout}
                className="h-10 w-10 text-muted-foreground"
                aria-label="Keluar"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md px-4 py-4 sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
          <OwnerDashboard statuses={statuses} logs={logs} users={users} onUsersChange={refreshUsers} />
        </main>
      </div>
    </ErrorBoundary>
  );
}
