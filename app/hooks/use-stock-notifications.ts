import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { ItemStatus } from "@/app/types";

const SHOWN_KEY = "dominico-notifications-shown";

function shouldShowToday(): boolean {
  if (typeof window === "undefined") return true;
  const lastShown = localStorage.getItem(SHOWN_KEY);
  const today = new Date().toISOString().split("T")[0];
  if (lastShown === today) return false;
  localStorage.setItem(SHOWN_KEY, today);
  return true;
}

export function useStockNotifications(statuses: ItemStatus[], viewedBy: "staff" | "owner") {
  const hasRun = useRef(false);

  useEffect(() => {
    if (statuses.length === 0) return;
    if (hasRun.current) return;
    hasRun.current = true;

    const canShow = shouldShowToday();
    if (!canShow) return;

    const lowStock = statuses.filter((s) => s.isLow);
    const overdue = statuses.filter((s) => s.isOverdue);

    if (viewedBy === "staff") {
      // Staff: real-time alert per item untuk stok menipis
      lowStock.forEach((s) => {
        toast.error(
          `${s.item.name} stok menipis`,
          {
            description: `Sisa ${s.currentStock} ${s.item.unit} (min ${s.item.minStock} ${s.item.unit}). Segera restock.`,
            duration: 6000,
          }
        );
      });

      if (overdue.length > 0) {
        toast.warning(
          `${overdue.length} item pengecekan terlewat`,
          {
            description: overdue.map((s) => `• ${s.item.name}`).join("\n"),
            duration: 6000,
          }
        );
      }
      return;
    }

    // Owner: ringkasan harian saja
    if (overdue.length > 0) {
      toast.warning(
        `${overdue.length} item pengecekan terlewat`,
        {
          description: overdue.map((s) => `• ${s.item.name}`).join("\n"),
          duration: 6000,
        }
      );
    }

    if (lowStock.length > 0) {
      toast.error(
        `${lowStock.length} item stok menipis hari ini`,
        {
          description: `${lowStock.length} item perlu perhatian. Cek tab Analitik untuk detail restock.`,
          duration: 6000,
        }
      );
    }
  }, [statuses, viewedBy]);
}
