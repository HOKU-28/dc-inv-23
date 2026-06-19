import { Item, StockLog, Sale, MonthlyUsage, ItemStatus, ReorderSuggestion, DailyQueue } from "@/app/types";
import { removeFromShoppingById } from "@/app/lib/shopping-list";

const ITEMS_KEY = "dominico-items";
const LOGS_KEY = "dominico-logs";
const SALES_KEY = "dominico-sales";
const DAILY_QUEUE_KEY = "dominico-daily-queue";

export const defaultItems: Item[] = [
  // Harian: cepat habis & sering dipakai
  { id: "cup-plastik", name: "Cup Plastik", unit: "pcs", category: "Kemasan", minStock: 80, checkFrequencyDays: 1, isActive: true, barcode: "8991001110001" },
  { id: "sedotan", name: "Sedotan", unit: "pcs", category: "Kemasan", minStock: 100, checkFrequencyDays: 1, isActive: true, barcode: "8991001110002" },
  { id: "tutup-gelas", name: "Tutup Gelas", unit: "pcs", category: "Kemasan", minStock: 80, checkFrequencyDays: 1, isActive: true, barcode: "8991001110003" },
  { id: "cup-kopi", name: "Cup Kopi", unit: "pcs", category: "Kemasan", minStock: 50, checkFrequencyDays: 1, isActive: true, barcode: "8991001110004" },
  { id: "telur", name: "Telur", unit: "pcs", category: "Bahan", minStock: 30, checkFrequencyDays: 1, isActive: true, barcode: "8991001110005" },
  { id: "roti", name: "Roti", unit: "pcs", category: "Bahan", minStock: 20, checkFrequencyDays: 1, isActive: true, barcode: "8991001110006" },
  { id: "es-batu", name: "Es Batu", unit: "kg", category: "Bahan", minStock: 10, checkFrequencyDays: 1, isActive: true, barcode: "8991001110007" },
  { id: "tisu", name: "Tisu Meja", unit: "pack", category: "Kemasan", minStock: 5, checkFrequencyDays: 1, isActive: true, barcode: "8991001110008" },
  // Mingguan: pemakaian relatif stabil
  { id: "ayam", name: "Ayam", unit: "kg", category: "Bahan", minStock: 5, checkFrequencyDays: 7, isActive: true, barcode: "8991001110009" },
  { id: "gula", name: "Gula", unit: "kg", category: "Bahan", minStock: 5, checkFrequencyDays: 7, isActive: true, barcode: "8991001110010" },
  { id: "kopi-bubuk", name: "Kopi Bubuk", unit: "kg", category: "Bahan", minStock: 2, checkFrequencyDays: 7, isActive: true, barcode: "8991001110011" },
  { id: "susu", name: "Susu", unit: "ml", category: "Bahan", minStock: 2000, checkFrequencyDays: 7, isActive: true, barcode: "8991001110012" },
  { id: "air-mineral", name: "Air Mineral", unit: "liter", category: "Bahan", minStock: 10, checkFrequencyDays: 7, isActive: true, barcode: "8991001110013" },
  { id: "minyak-goreng", name: "Minyak Goreng", unit: "liter", category: "Bahan", minStock: 2, checkFrequencyDays: 7, isActive: true, barcode: "8991001110014" },
  { id: "saus-sambal", name: "Saus Sambal", unit: "ml", category: "Bahan", minStock: 500, checkFrequencyDays: 7, isActive: true, barcode: "8991001110015" },
  // Nonaktif (arsip) untuk demo
  { id: "cup-lama", name: "Cup Lama 12oz", unit: "pcs", category: "Kemasan", minStock: 20, checkFrequencyDays: 7, isActive: false, barcode: "8991001110099" },
];

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function frequencyLabel(item: Item): string {
  if (item.checkFrequencyDays <= 1) return "Harian";
  if (item.checkFrequencyDays >= 7) return "Mingguan";
  return `${item.checkFrequencyDays} hari`;
}

// ---------- Items ----------

export function getItems(): Item[] {
  if (typeof window === "undefined") return defaultItems;
  const raw = localStorage.getItem(ITEMS_KEY);
  if (!raw) {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(defaultItems));
    return defaultItems;
  }
  const parsed: Item[] = JSON.parse(raw);
  // Migration: legacy items without isActive default to active
  const migrated = parsed.map((item) => ({
    ...item,
    isActive: item.isActive ?? true,
  }));
  if (migrated.some((item, i) => item.isActive !== parsed[i].isActive)) {
    saveItems(migrated);
  }
  return migrated;
}

export function saveItems(items: Item[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

// ---------- Logs ----------

export function getLogs(): StockLog[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOGS_KEY);
  if (!raw) {
    const seed = seedLogs();
    localStorage.setItem(LOGS_KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(raw);
}

export function saveLogs(logs: StockLog[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

function seedLogs(): StockLog[] {
  const logs: StockLog[] = [];
  let createdAt = Date.now();

  const profiles: Record<string, { dailyUse: [number, number]; restock: [number, number] }> = {
    "cup-plastik": { dailyUse: [30, 50], restock: [200, 300] },
    sedotan: { dailyUse: [25, 45], restock: [150, 250] },
    "tutup-gelas": { dailyUse: [28, 48], restock: [180, 280] },
    "cup-kopi": { dailyUse: [15, 30], restock: [100, 150] },
    telur: { dailyUse: [10, 18], restock: [60, 90] },
    roti: { dailyUse: [8, 15], restock: [40, 60] },
    "es-batu": { dailyUse: [3, 6], restock: [15, 25] },
    tisu: { dailyUse: [1, 2], restock: [10, 15] },
    ayam: { dailyUse: [1, 3], restock: [8, 12] },
    gula: { dailyUse: [0.3, 0.7], restock: [5, 8] },
    "kopi-bubuk": { dailyUse: [0.2, 0.5], restock: [3, 5] },
    susu: { dailyUse: [300, 600], restock: [3000, 5000] },
    "air-mineral": { dailyUse: [2, 5], restock: [15, 25] },
    "minyak-goreng": { dailyUse: [0.1, 0.3], restock: [3, 5] },
    "saus-sambal": { dailyUse: [30, 60], restock: [500, 750] },
  };

  const weeklyItems = ["ayam", "gula", "kopi-bubuk", "susu", "air-mineral", "minyak-goreng", "saus-sambal"];

  for (let i = 29; i >= 0; i--) {
    const date = addDays(todayStr(), -i);

    Object.entries(profiles).forEach(([itemId, profile], index) => {
      const isWeekly = weeklyItems.includes(itemId);
      const checkInterval = isWeekly ? 7 : index % 3 === 0 ? 1 : 2;
      const dayOffset = i % checkInterval;
      const needsRestock = dayOffset === 0 || (i % 5 === 0 && !isWeekly);

      if (needsRestock) {
        const [minRestock, maxRestock] = profile.restock;
        const restockQty = Math.floor(Math.random() * (maxRestock - minRestock + 1)) + minRestock;
        logs.push({
          id: generateId(),
          itemId,
          type: "in",
          qty: restockQty,
          date,
          note: isWeekly ? "Beli mingguan" : "Restock harian",
          recordedBy: "Staff",
          createdAt: createdAt++,
        });
      }

      if (dayOffset === 0 || (!isWeekly && i % 2 === 0)) {
        const [minUse, maxUse] = profile.dailyUse;
        const used = (Math.random() * (maxUse - minUse) + minUse) * (isWeekly ? checkInterval : 1);
        const roundedUsed = Math.max(0, Math.round(used));
        const baseStock = profile.restock[0];
        const currentStock = Math.max(0, Math.round(baseStock - roundedUsed * (isWeekly ? 1 : 1.5)));
        logs.push({
          id: generateId(),
          itemId,
          type: "check",
          qty: currentStock,
          date,
          note: "Cek sisa",
          recordedBy: "Staff",
          createdAt: createdAt++,
        });
      }
    });
  }

  const lowStockTargets = ["cup-kopi", "telur", "minyak-goreng"];
  lowStockTargets.forEach((itemId) => {
    const item = defaultItems.find((i) => i.id === itemId);
    if (!item) return;
    logs.push({
      id: generateId(),
      itemId,
      type: "check",
      qty: Math.max(0, item.minStock - Math.floor(Math.random() * 5) - 1),
      date: todayStr(),
      note: "Cek akhir hari",
      recordedBy: "Staff",
      createdAt: createdAt++,
    });
  });

  const overdueTarget = "roti";
  const lastCheck = addDays(todayStr(), -5);
  logs.push({
    id: generateId(),
    itemId: overdueTarget,
    type: "check",
    qty: 5,
    date: lastCheck,
    note: "Cek terakhir",
    recordedBy: "Staff",
    createdAt: createdAt++,
  });

  return logs;
}

export function addLog(log: Omit<StockLog, "id" | "createdAt">): StockLog {
  const newLog: StockLog = { ...log, id: generateId(), createdAt: Date.now() };
  const logs = getLogs();
  logs.push(newLog);
  saveLogs(logs);
  if (log.type === "in") {
    const item = getItems().find((i) => i.id === log.itemId);
    if (item) {
      const status = getItemStatus(item, logs);
      if (status.currentStock > item.minStock) {
        removeFromShoppingById(log.itemId);
      }
    }
  }
  return newLog;
}

export function deleteLog(id: string) {
  const logs = getLogs().filter((l) => l.id !== id);
  saveLogs(logs);
}

export function addItem(item: Omit<Item, "id" | "isActive"> & { isActive?: boolean }): Item {
  const newItem: Item = { ...item, id: generateId(), isActive: item.isActive ?? true };
  const items = getItems();
  items.push(newItem);
  saveItems(items);
  return newItem;
}

export function archiveItem(id: string): Item | undefined {
  const items = getItems();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return undefined;
  items[index] = { ...items[index], isActive: false };
  saveItems(items);
  return items[index];
}

export function restoreItem(id: string): Item | undefined {
  const items = getItems();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return undefined;
  items[index] = { ...items[index], isActive: true };
  saveItems(items);
  return items[index];
}

export function getActiveItems(items?: Item[]): Item[] {
  return (items ?? getItems()).filter((i) => i.isActive !== false);
}

export function getArchivedItems(items?: Item[]): Item[] {
  return (items ?? getItems()).filter((i) => i.isActive === false);
}

// ---------- Sales ----------

export function getSales(): Sale[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SALES_KEY);
  if (!raw) {
    localStorage.setItem(SALES_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveSales(sales: Sale[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SALES_KEY, JSON.stringify(sales));
}

export function addSale(sale: Omit<Sale, "id" | "createdAt">): Sale {
  const newSale: Sale = { ...sale, id: generateId(), createdAt: Date.now() };
  const sales = getSales();
  sales.push(newSale);
  saveSales(sales);
  return newSale;
}

export function deleteSale(id: string) {
  const sales = getSales().filter((s) => s.id !== id);
  saveSales(sales);
}

// ---------- Queries ----------

export function getItemLogs(itemId: string, logs?: StockLog[]): StockLog[] {
  const all = logs ?? getLogs();
  return all
    .filter((l) => l.itemId === itemId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.createdAt - b.createdAt);
}

export function getCurrentStock(itemId: string, asOfDateStr?: string, logs?: StockLog[]): number {
  const itemLogs = getItemLogs(itemId, logs);
  const asOf = asOfDateStr ?? todayStr();
  let balance = 0;
  for (const log of itemLogs) {
    if (log.date > asOf) break;
    if (log.type === "in") {
      balance += log.qty;
    } else if (log.type === "check") {
      balance = log.qty;
    }
  }
  return balance;
}

export function getLastCheckDate(itemId: string, logs?: StockLog[]): string | undefined {
  const itemLogs = getItemLogs(itemId, logs);
  const checks = itemLogs.filter((l) => l.type === "check");
  return checks.length ? checks[checks.length - 1].date : undefined;
}

export function getItemStatus(item: Item, logs?: StockLog[]): ItemStatus {
  const allLogs = logs ?? getLogs();
  const currentStock = getCurrentStock(item.id, todayStr(), allLogs);
  const lastCheckDate = getLastCheckDate(item.id, allLogs);
  const nextCheckDate = lastCheckDate ? addDays(lastCheckDate, item.checkFrequencyDays) : todayStr();
  const isLow = currentStock <= item.minStock;
  const isOverdue = nextCheckDate < todayStr();
  return { item, currentStock, lastCheckDate, nextCheckDate, isLow, isOverdue };
}

export function getDueItems(items?: Item[], logs?: StockLog[]): ItemStatus[] {
  const allItems = items ?? getItems();
  const allLogs = logs ?? getLogs();
  const today = todayStr();
  return allItems
    .map((item) => getItemStatus(item, allLogs))
    .filter((s) => s.nextCheckDate && s.nextCheckDate <= today && s.lastCheckDate !== today)
    .sort((a, b) => (a.nextCheckDate ?? "").localeCompare(b.nextCheckDate ?? ""));
}

// ---------- Daily rotation queue ----------

export function generateDailyQueue(statuses?: ItemStatus[], targetSize = 10): DailyQueue {
  const today = todayStr();
  const allStatuses = statuses ?? getActiveItems().map((item) => getItemStatus(item));

  // Item habis/menipis selalu masuk tugas (exception boleh lebih dari 10).
  const lowOut = allStatuses
    .filter((s) => s.currentStock <= 0 || s.isLow)
    .sort((a, b) => {
      const pa = a.currentStock <= 0 ? 0 : 1;
      const pb = b.currentStock <= 0 ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return a.item.name.localeCompare(b.item.name);
    });

  // Item lain yang butuh dicek hari ini: lewat jatuh tempo atau due hari ini,
  // tapi hanya kalau belum dicek hari ini.
  const others = allStatuses
    .filter((s) => !(s.currentStock <= 0 || s.isLow) && s.lastCheckDate !== today && (s.isOverdue || s.nextCheckDate === today))
    .sort((a, b) => {
      const pa = a.isOverdue ? 0 : 1;
      const pb = b.isOverdue ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (a.nextCheckDate ?? "").localeCompare(b.nextCheckDate ?? "") || a.item.name.localeCompare(b.item.name);
    });

  const remainingSlots = Math.max(0, targetSize - lowOut.length);
  const queue = [...lowOut.map((s) => s.item.id), ...others.slice(0, remainingSlots).map((s) => s.item.id)];
  const backlog = others.slice(remainingSlots).map((s) => s.item.id);

  return { date: today, queue, backlog };
}

export function refillDailyQueue(date: string = todayStr()): DailyQueue {
  if (typeof window === "undefined") return { date, queue: [], backlog: [] };
  const current = getDailyQueue(date);
  const items = getActiveItems();
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const logs = getLogs();

  const isDone = (id: string) => {
    const item = itemMap.get(id);
    if (!item) return true;
    return getItemStatus(item, logs).lastCheckDate === date;
  };

  const queue = current.queue.filter((id) => !isDone(id));
  let backlog = current.backlog.filter((id) => !isDone(id));

  while (queue.length < 10 && backlog.length > 0) {
    queue.push(backlog.shift()!);
  }

  const updated = { date, queue, backlog };
  saveDailyQueue(updated);
  return updated;
}

export function getDailyQueue(date: string = todayStr()): DailyQueue {
  if (typeof window === "undefined") return { date, queue: [], backlog: [] };
  const raw = localStorage.getItem(DAILY_QUEUE_KEY);
  if (raw) {
    const parsed: DailyQueue = JSON.parse(raw);
    if (parsed.date === date) return parsed;
  }
  const generated = generateDailyQueue(undefined, 10);
  localStorage.setItem(DAILY_QUEUE_KEY, JSON.stringify(generated));
  return generated;
}

export function saveDailyQueue(queue: DailyQueue) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_QUEUE_KEY, JSON.stringify(queue));
}

export function resetDailyQueue() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DAILY_QUEUE_KEY);
}

// ---------- Period usage ----------

export function getPeriodUsage(
  itemId: string,
  start: string,
  end: string,
  logs?: StockLog[]
): MonthlyUsage {
  const allLogs = logs ?? getLogs();
  const items = getItems();
  const item = items.find((i) => i.id === itemId)!;

  const itemLogs = getItemLogs(itemId, allLogs);

  let opening = 0;
  for (const log of itemLogs) {
    if (log.date < start) {
      if (log.type === "in") opening += log.qty;
      else if (log.type === "check") opening = log.qty;
    }
  }

  let closing = opening;
  let hasClosing = false;
  const periodLogs = itemLogs.filter((l) => l.date >= start && l.date <= end);
  const totalIn = periodLogs.filter((l) => l.type === "in").reduce((sum, l) => sum + l.qty, 0);

  for (const log of periodLogs) {
    if (log.type === "check") {
      closing = log.qty;
      hasClosing = true;
    }
  }

  if (!hasClosing) {
    closing = opening + totalIn;
  }

  const used = opening + totalIn - closing;

  return {
    itemId,
    itemName: item.name,
    unit: item.unit,
    opening,
    totalIn,
    closing,
    used: Math.max(0, used),
  };
}

export function getMonthlyUsage(itemId: string, year: number, month: number, logs?: StockLog[]): MonthlyUsage {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return getPeriodUsage(itemId, start, end, logs);
}

export function getDailyUsage(itemId: string, date: string, logs?: StockLog[]): MonthlyUsage {
  return getPeriodUsage(itemId, date, date, logs);
}

export function getWeeklyUsage(itemId: string, year: number, week: number, logs?: StockLog[]): MonthlyUsage {
  // ISO week: week 1 is the week with the first Thursday of the year
  const start = getDateOfISOWeek(year, week);
  const end = addDays(start, 6);
  return getPeriodUsage(itemId, start, end, logs);
}

export function getYearlyUsage(itemId: string, year: number, logs?: StockLog[]): MonthlyUsage {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  return getPeriodUsage(itemId, start, end, logs);
}

export function getWeekDateRange(year: number, week: number): { start: string; end: string } {
  const start = getDateOfISOWeek(year, week);
  const end = addDays(start, 6);
  return { start, end };
}

export function formatPeriodRange(start: string, end: string): string {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");

  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  const sameYear = startDate.getFullYear() === endDate.getFullYear();

  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const endMonth = endDate.toLocaleString("id-ID", { month: "short" });

  if (sameMonth) {
    return `${startDay}–${endDay} ${endMonth}`;
  }

  const startMonth = startDate.toLocaleString("id-ID", { month: "short" });

  if (sameYear) {
    return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
  }

  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatWeekLabel(year: number, week: number): string {
  const { start, end } = getWeekDateRange(year, week);
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");

  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startMonth = startDate.toLocaleString("id-ID", { month: "short" });
  const endMonth = endDate.toLocaleString("id-ID", { month: "short" });

  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startDay}–${endDay} ${endMonth} ${year}`;
  }

  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${year}`;
}

function getDateOfISOWeek(year: number, week: number): string {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart.toISOString().split("T")[0];
}

export function getISOWeek(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  const tmp = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  tmp.setDate(tmp.getDate() - dayNr + 3);
  const firstThursday = tmp.valueOf();
  tmp.setMonth(0, 1);
  if (tmp.getDay() !== 4) {
    tmp.setMonth(0, 1 + ((4 - tmp.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - tmp.valueOf()) / 604800000);
}

export function getISOWeeksInYear(year: number): number {
  const d = new Date(year, 11, 31);
  const week = getISOWeek(d.toISOString().split("T")[0]);
  return week === 1 ? getISOWeek(new Date(year, 11, 24).toISOString().split("T")[0]) : week;
}

// ---------- Sales-based predictions ----------

const USAGE_WINDOW_DAYS = 14; // rata-rata dihitung dari 14 hari terakhir

export function getAverageDailyUsage(itemId: string, sales?: Sale[]): number {
  const allSales = sales ?? getSales();
  const today = todayStr();
  const since = addDays(today, -USAGE_WINDOW_DAYS);
  const recent = allSales.filter((s) => s.itemId === itemId && s.date >= since && s.date <= today);
  if (recent.length === 0) return 0;
  const total = recent.reduce((sum, s) => sum + s.qty, 0);
  return total / USAGE_WINDOW_DAYS;
}

export function getEstimatedDaysLeft(itemId: string, currentStock: number, sales?: Sale[]): number {
  const avg = getAverageDailyUsage(itemId, sales);
  if (avg <= 0) return Infinity;
  return currentStock / avg;
}

export function getReorderSuggestion(item: Item, logs?: StockLog[], sales?: Sale[]): ReorderSuggestion {
  const allLogs = logs ?? getLogs();
  const allSales = sales ?? getSales();
  const currentStock = getCurrentStock(item.id, todayStr(), allLogs);
  const avgDailyUsage = getAverageDailyUsage(item.id, allSales);
  const estimatedDaysLeft = avgDailyUsage > 0 ? currentStock / avgDailyUsage : Infinity;

  let urgency: ReorderSuggestion["urgency"] = "safe";
  if (estimatedDaysLeft <= 2 || currentStock <= item.minStock) {
    urgency = "urgent";
  } else if (estimatedDaysLeft <= 7) {
    urgency = "soon";
  }

  const safetyLeadTime = urgency === "urgent" ? 0 : urgency === "soon" ? 1 : 3;
  const suggestedOrderDate =
    Number.isFinite(estimatedDaysLeft) && estimatedDaysLeft > safetyLeadTime
      ? addDays(todayStr(), Math.max(0, Math.floor(estimatedDaysLeft - safetyLeadTime)))
      : todayStr();

  return {
    item,
    currentStock,
    avgDailyUsage,
    estimatedDaysLeft,
    suggestedOrderDate,
    urgency,
  };
}

export function getAllReorderSuggestions(items?: Item[], logs?: StockLog[], sales?: Sale[]): ReorderSuggestion[] {
  const allItems = items ?? getItems();
  return allItems.map((item) => getReorderSuggestion(item, logs, sales));
}
