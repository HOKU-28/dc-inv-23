import { supabase, isOnline, isSupabaseConfigured } from "@/app/lib/supabase";
import { Item, StockLog, Sale } from "@/app/types";

const ITEMS_KEY = "dominico-items";
const LOGS_KEY = "dominico-logs";
const SALES_KEY = "dominico-sales";

let syncing = false;

export function isSyncing(): boolean {
  return syncing;
}

function isNetworkError(error: { message?: string; details?: string } | null): boolean {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return text.includes("failed to fetch") || text.includes("networkerror");
}

function logSyncError(label: string, error: { message?: string; details?: string } | null): void {
  if (isNetworkError(error)) return;
  console.error(label, error);
}

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Items ----------

function itemToRow(item: Item): Record<string, unknown> {
  return {
    id: item.id,
    name: item.name,
    unit: item.unit,
    category: item.category,
    min_stock: item.minStock,
    check_frequency_days: item.checkFrequencyDays,
    is_active: item.isActive,
    barcode: item.barcode ?? null,
    location: item.location ?? null,
    updated_at: item.updatedAt ?? null,
  };
}

function rowToItem(row: Record<string, unknown>): Item {
  return {
    id: String(row.id),
    name: String(row.name),
    unit: String(row.unit),
    category: String(row.category),
    minStock: Number(row.min_stock),
    checkFrequencyDays: Number(row.check_frequency_days),
    isActive: Boolean(row.is_active),
    barcode: row.barcode ? String(row.barcode) : undefined,
    location: row.location ? String(row.location) : undefined,
    updatedAt: row.updated_at ? Number(row.updated_at) : undefined,
  };
}

export async function pushItems(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  const items = readLocal<Item[]>(ITEMS_KEY, []);
  if (items.length === 0) return;

  const rows = items.map(itemToRow);
  const { error } = await supabase.from("items").upsert(rows, { onConflict: "id" });
  if (error) {
    logSyncError("[sync] Failed to push items:", error);
  }
}

export async function pullItems(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  const { data, error } = await supabase.from("items").select("*");
  if (error || !data) {
    logSyncError("[sync] Failed to pull items:", error);
    return;
  }

  const localItems = readLocal<Item[]>(ITEMS_KEY, []);
  const localMap = new Map(localItems.map((item) => [item.id, item]));

  for (const row of data) {
    const remote = rowToItem(row as Record<string, unknown>);
    const local = localMap.get(remote.id);
    const remoteUpdated = remote.updatedAt ?? 0;
    const localUpdated = local?.updatedAt ?? 0;
    if (!local || remoteUpdated > localUpdated) {
      localMap.set(remote.id, remote);
    }
  }

  writeLocal(ITEMS_KEY, Array.from(localMap.values()));
}

// ---------- Stock logs ----------

type StockLogRow = Record<string, unknown>;

function logToRow(log: StockLog): StockLogRow {
  return {
    id: log.id,
    item_id: log.itemId,
    type: log.type,
    qty: log.qty,
    date: log.date,
    note: log.note ?? null,
    recorded_by: log.recordedBy ?? null,
    created_at: log.createdAt,
  };
}

function rowToLog(row: StockLogRow): StockLog {
  return {
    id: String(row.id),
    itemId: String(row.item_id),
    type: row.type as StockLog["type"],
    qty: Number(row.qty),
    date: String(row.date),
    note: row.note ? String(row.note) : undefined,
    recordedBy: row.recorded_by ? String(row.recorded_by) : undefined,
    createdAt: Number(row.created_at),
  };
}

export async function pushLogs(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  const logs = readLocal<StockLog[]>(LOGS_KEY, []);

  const rows = logs.map(logToRow);
  const { error } = await supabase.from("stock_logs").upsert(rows, { onConflict: "id" });
  if (error) {
    logSyncError("[sync] Failed to push logs:", error);
    return;
  }

  const localIds = new Set(logs.map((l) => l.id));
  const { data: remoteLogs, error: fetchError } = await supabase.from("stock_logs").select("id");
  if (fetchError || !remoteLogs) return;

  const idsToDelete = remoteLogs
    .map((r) => String((r as Record<string, unknown>).id))
    .filter((id) => !localIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase.from("stock_logs").delete().in("id", idsToDelete);
    if (deleteError) {
      logSyncError("[sync] Failed to delete remote logs:", deleteError);
    }
  }
}

export async function pullLogs(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  const { data, error } = await supabase.from("stock_logs").select("*");
  if (error || !data) {
    logSyncError("[sync] Failed to pull logs:", error);
    return;
  }

  const localLogs = readLocal<StockLog[]>(LOGS_KEY, []);
  const localIds = new Set(localLogs.map((l) => l.id));

  for (const row of data) {
    const log = rowToLog(row as StockLogRow);
    if (!localIds.has(log.id)) {
      localLogs.push(log);
    }
  }

  writeLocal(LOGS_KEY, localLogs);
}

// ---------- Sales ----------

type SaleRow = Record<string, unknown>;

function saleToRow(sale: Sale): SaleRow {
  return {
    id: sale.id,
    item_id: sale.itemId,
    qty: sale.qty,
    date: sale.date,
    note: sale.note ?? null,
    created_at: sale.createdAt,
  };
}

function rowToSale(row: SaleRow): Sale {
  return {
    id: String(row.id),
    itemId: String(row.item_id),
    qty: Number(row.qty),
    date: String(row.date),
    note: row.note ? String(row.note) : undefined,
    createdAt: Number(row.created_at),
  };
}

export async function pushSales(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  const sales = readLocal<Sale[]>(SALES_KEY, []);

  const rows = sales.map(saleToRow);
  const { error } = await supabase.from("sales").upsert(rows, { onConflict: "id" });
  if (error) {
    logSyncError("[sync] Failed to push sales:", error);
    return;
  }

  const localIds = new Set(sales.map((s) => s.id));
  const { data: remoteSales, error: fetchError } = await supabase.from("sales").select("id");
  if (fetchError || !remoteSales) return;

  const idsToDelete = remoteSales
    .map((r) => String((r as Record<string, unknown>).id))
    .filter((id) => !localIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase.from("sales").delete().in("id", idsToDelete);
    if (deleteError) {
      logSyncError("[sync] Failed to delete remote sales:", deleteError);
    }
  }
}

export async function pullSales(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  const { data, error } = await supabase.from("sales").select("*");
  if (error || !data) {
    logSyncError("[sync] Failed to pull sales:", error);
    return;
  }

  const localSales = readLocal<Sale[]>(SALES_KEY, []);
  const localIds = new Set(localSales.map((s) => s.id));

  for (const row of data) {
    const sale = rowToSale(row as SaleRow);
    if (!localIds.has(sale.id)) {
      localSales.push(sale);
    }
  }

  writeLocal(SALES_KEY, localSales);
}

// ---------- Orchestration ----------

export async function pushToSupabase(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  await Promise.all([pushItems(), pushLogs(), pushSales()]);
}

export async function pullFromSupabase(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  await Promise.all([pullItems(), pullLogs(), pullSales()]);
}

export async function syncAll(): Promise<void> {
  if (syncing) return;
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;

  syncing = true;
  try {
    // Items: pull first so newer remote items win local conflicts.
    // Logs/Sales: push first so local deletions are preserved before pulling remote additions.
    await Promise.all([pullItems(), pushLogs(), pushSales()]);
    await Promise.all([pushItems(), pullLogs(), pullSales()]);
  } catch (err) {
    console.error("[sync] syncAll failed:", err);
  } finally {
    syncing = false;
  }
}

export async function syncItems(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  await pushItems();
}

export async function syncLogs(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  await pushLogs();
}

export async function syncSales(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  await pushSales();
}
