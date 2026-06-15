import { Item, ItemStatus, StockLog } from "@/app/types";
import {
  addDays,
  getCurrentStock,
  getDailyUsage,
  getISOWeek,
  getISOWeeksInYear,
  getItemStatus,
  getMonthlyUsage,
  getPeriodUsage,
  getWeeklyUsage,
  getYearlyUsage,
  todayStr,
} from "@/app/lib/data";

export type MovementPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface StockMovementPoint {
  label: string;
  date: string;
  in: number;
  used: number;
}

export interface TopItem {
  itemId: string;
  itemName: string;
  unit: string;
  used: number;
}

export interface LowStockItem {
  item: Item;
  currentStock: number;
  minStock: number;
  gap: number;
}

export interface ReorderRecommendation {
  item: Item;
  currentStock: number;
  avgDailyUsage: number;
  estimatedDaysLeft: number;
  suggestedQty: number;
  urgency: "safe" | "soon" | "urgent";
}

function formatMovementLabel(key: string, period: MovementPeriod): string {
  if (period === "daily") {
    const d = new Date(key + "T00:00:00");
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }
  if (period === "weekly") {
    const [year, weekStr] = key.split("-W");
    return `Minggu ${weekStr} '${String(year).slice(-2)}`;
  }
  if (period === "monthly") {
    const [year, month] = key.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
  }
  return key;
}

export function getStockMovementData(
  items: Item[],
  logs: StockLog[],
  period: MovementPeriod,
  pointCount: number = 7
): StockMovementPoint[] {
  const today = todayStr();
  const points: StockMovementPoint[] = [];

  if (period === "daily") {
    for (let i = pointCount - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      const allIn = logs.filter((l) => l.type === "in" && l.date === date).reduce((sum, l) => sum + l.qty, 0);
      const allUsed = items.reduce((sum, item) => {
        const usage = getDailyUsage(item.id, date, logs);
        return sum + usage.used;
      }, 0);
      points.push({ label: formatMovementLabel(date, period), date, in: allIn, used: allUsed });
    }
  } else if (period === "weekly") {
    const todayDate = new Date(today + "T00:00:00");
    const currentYear = todayDate.getFullYear();
    const currentWeek = getISOWeek(today);
    for (let i = pointCount - 1; i >= 0; i--) {
      let year = currentYear;
      let week = currentWeek - i;
      while (week <= 0) {
        year -= 1;
        const weeksInYear = getISOWeeksInYear(year);
        week += weeksInYear;
      }
      const allIn = logs.filter((l) => l.type === "in" && getISOWeek(l.date) === week && new Date(l.date + "T00:00:00").getFullYear() === year).reduce((sum, l) => sum + l.qty, 0);
      const allUsed = items.reduce((sum, item) => {
        const usage = getWeeklyUsage(item.id, year, week, logs);
        return sum + usage.used;
      }, 0);
      const key = `${year}-W${String(week).padStart(2, "0")}`;
      points.push({ label: formatMovementLabel(key, period), date: key, in: allIn, used: allUsed });
    }
  } else if (period === "monthly") {
    const todayDate = new Date(today + "T00:00:00");
    const year = todayDate.getFullYear();
    const month = todayDate.getMonth() + 1;
    for (let i = pointCount - 1; i >= 0; i--) {
      let targetMonth = month - i;
      let targetYear = year;
      while (targetMonth <= 0) {
        targetYear -= 1;
        targetMonth += 12;
      }
      const allIn = logs.filter((l) => {
        const d = new Date(l.date + "T00:00:00");
        return l.type === "in" && d.getFullYear() === targetYear && d.getMonth() + 1 === targetMonth;
      }).reduce((sum, l) => sum + l.qty, 0);
      const allUsed = items.reduce((sum, item) => {
        const usage = getMonthlyUsage(item.id, targetYear, targetMonth, logs);
        return sum + usage.used;
      }, 0);
      const key = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
      points.push({ label: formatMovementLabel(key, period), date: key, in: allIn, used: allUsed });
    }
  } else {
    const currentYear = new Date(today + "T00:00:00").getFullYear();
    for (let i = pointCount - 1; i >= 0; i--) {
      const targetYear = currentYear - i;
      const allIn = logs.filter((l) => l.type === "in" && new Date(l.date + "T00:00:00").getFullYear() === targetYear).reduce((sum, l) => sum + l.qty, 0);
      const allUsed = items.reduce((sum, item) => {
        const usage = getYearlyUsage(item.id, targetYear, logs);
        return sum + usage.used;
      }, 0);
      points.push({ label: formatMovementLabel(String(targetYear), period), date: String(targetYear), in: allIn, used: allUsed });
    }
  }

  return points;
}

export function getTopUsedItems(
  items: Item[],
  logs: StockLog[],
  days: number = 30,
  limit: number = 5
): TopItem[] {
  const today = todayStr();
  const since = addDays(today, -days + 1);
  const result = items.map((item) => {
    const usage = getPeriodUsage(item.id, since, today, logs);
    return {
      itemId: item.id,
      itemName: item.name,
      unit: item.unit,
      used: usage.used,
    };
  });
  return result.filter((r) => r.used > 0).sort((a, b) => b.used - a.used).slice(0, limit);
}

export function getLowStockItems(statuses: ItemStatus[]): LowStockItem[] {
  return statuses
    .filter((s) => s.isLow)
    .map((s) => ({
      item: s.item,
      currentStock: s.currentStock,
      minStock: s.item.minStock,
      gap: Math.max(0, s.item.minStock - s.currentStock),
    }))
    .sort((a, b) => b.gap - a.gap);
}

function getAverageDailyUsageFromLogs(itemId: string, logs: StockLog[], days: number = 30): number {
  const today = todayStr();
  const since = addDays(today, -days + 1);
  const usage = getPeriodUsage(itemId, since, today, logs);
  if (usage.used <= 0) return 0;
  return usage.used / days;
}

export function getReorderRecommendations(
  items: Item[],
  logs: StockLog[],
  statuses?: ItemStatus[]
): ReorderRecommendation[] {
  const itemStatuses = statuses ?? items.map((item) => getItemStatus(item, logs));
  const today = todayStr();

  return items
    .map((item) => {
      const status = itemStatuses.find((s) => s.item.id === item.id);
      const currentStock = status?.currentStock ?? getCurrentStock(item.id, today, logs);
      const avgDailyUsage = getAverageDailyUsageFromLogs(item.id, logs, 30);
      const estimatedDaysLeft = avgDailyUsage > 0 ? currentStock / avgDailyUsage : Infinity;

      let urgency: ReorderRecommendation["urgency"] = "safe";
      if (currentStock <= item.minStock || estimatedDaysLeft <= 2) {
        urgency = "urgent";
      } else if (estimatedDaysLeft <= 7) {
        urgency = "soon";
      }

      const suggestedQty =
        currentStock < item.minStock
          ? Math.max(item.minStock * 2 - currentStock, item.minStock)
          : Math.ceil(avgDailyUsage * 14);

      return {
        item,
        currentStock,
        avgDailyUsage,
        estimatedDaysLeft,
        suggestedQty,
        urgency,
      };
    })
    .filter((r) => r.urgency !== "safe")
    .sort((a, b) => {
      const urgencyOrder = { urgent: 0, soon: 1, safe: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || a.estimatedDaysLeft - b.estimatedDaysLeft;
    });
}

// Re-export for convenience
export { getISOWeek } from "@/app/lib/data";
