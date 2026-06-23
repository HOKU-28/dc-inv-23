import { supabase, isOnline, isSupabaseConfigured } from "@/app/lib/supabase";
import { DailyQueue } from "@/app/types";
import { getUsers, saveUsers, User } from "@/app/lib/auth";
import {
  getShoppingIds,
  saveShoppingIds,
} from "@/app/lib/shopping-list";

const DAILY_QUEUE_KEY = "dominico-daily-queue";

// Schema mismatch pada Supabase (tabel/kolom tidak ada) akan muncul sebagai
// PGRST204 / PGRST205. Karena app ini offline-first dan sync cloud bersifat
// opsional, error semacam itu tidak perlu di-spam di console browser.
function isSchemaError(error: { code?: string } | null): boolean {
  return error?.code === "PGRST204" || error?.code === "PGRST205";
}

function isNetworkError(error: { message?: string; details?: string } | null): boolean {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return text.includes("failed to fetch") || text.includes("networkerror");
}

function logSyncError(label: string, error: { code?: string; message?: string; details?: string } | null): void {
  if (isSchemaError(error)) return;
  if (isNetworkError(error)) return;
  console.error(label, error);
}

function formatNotInValues(values: string[]): string {
  return `(${values
    .map((v) => `"${String(v).replace(/"/g, '\\"')}"`)
    .join(",")})`;
}

function readLocalRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function writeLocalRaw(key: string, value: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
}

function readDailyQueue(): DailyQueue | null {
  const raw = readLocalRaw(DAILY_QUEUE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailyQueue;
  } catch {
    return null;
  }
}

function writeDailyQueue(queue: DailyQueue) {
  writeLocalRaw(DAILY_QUEUE_KEY, JSON.stringify(queue));
}

// ---------- Users ----------

function userToRow(user: User): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    password_hash: user.passwordHash ?? null,
    recovery_code_hash: user.recoveryCodeHash ?? null,
    role: user.role,
    name: user.name,
    updated_at: user.updatedAt ?? 0,
  };
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: row.password_hash ? String(row.password_hash) : undefined,
    recoveryCodeHash: row.recovery_code_hash ? String(row.recovery_code_hash) : undefined,
    role: row.role as User["role"],
    name: String(row.name),
    updatedAt: row.updated_at ? Number(row.updated_at) : 0,
  };
}

export async function pushUsers(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  const users = getUsers();
  if (users.length === 0) return;
  const rows = users.map(userToRow);
  const { error } = await supabase.from("users").upsert(rows, { onConflict: "id" });
  if (error) {
    logSyncError("[sync-extra] pushUsers failed:", error);
  }
}

export async function pullUsers(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  const { data, error } = await supabase.from("users").select("*");
  if (error || !data) {
    if (error) logSyncError("[sync-extra] pullUsers failed:", error);
    return;
  }

  const localUsers = getUsers();
  const localMap = new Map(localUsers.map((u) => [u.id, u]));

  for (const row of data) {
    const remote = rowToUser(row as Record<string, unknown>);
    const local = localMap.get(remote.id);
    const remoteUpdated = remote.updatedAt ?? 0;
    const localUpdated = local?.updatedAt ?? 0;
    if (!local || remoteUpdated >= localUpdated) {
      localMap.set(remote.id, remote);
    }
  }

  saveUsers(Array.from(localMap.values()));
}

// ---------- Shopping list ----------

export async function pushShoppingList(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  const ids = getShoppingIds();
  const rows = ids.map((id) => ({ id, item_id: id, created_at: Date.now() }));

  // Replace remote state with current local state.
  // .not() dengan operator 'in' butuh PostgREST raw syntax: "(\"a\",\"b\")".
  const { error: deleteError } =
    ids.length > 0
      ? await supabase
          .from("shopping_list")
          .delete()
          .not("id", "in", formatNotInValues(ids))
      : await supabase.from("shopping_list").delete().neq("id", "");
  if (deleteError) {
    logSyncError("[sync-extra] pushShoppingList delete failed:", deleteError);
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("shopping_list").upsert(rows, { onConflict: "id" });
    if (error) {
      logSyncError("[sync-extra] pushShoppingList upsert failed:", error);
    }
  }
}

export async function pullShoppingList(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  const { data, error } = await supabase.from("shopping_list").select("*");
  if (error || !data) {
    if (error) logSyncError("[sync-extra] pullShoppingList failed:", error);
    return;
  }

  const remoteIds = data.map((row) => String((row as Record<string, unknown>).item_id));
  const localIds = getShoppingIds();
  const merged = Array.from(new Set([...localIds, ...remoteIds]));
  saveShoppingIds(merged);
}

// ---------- Daily queue ----------

export async function pushDailyQueue(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  const queue = readDailyQueue();
  if (!queue) return;
  const row = {
    date: queue.date,
    queue: queue.queue,
    backlog: queue.backlog,
  };
  const { error } = await supabase.from("daily_queue").upsert(row, { onConflict: "date" });
  if (error) {
    logSyncError("[sync-extra] pushDailyQueue failed:", error);
  }
}

export async function pullDailyQueue(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  const local = readDailyQueue();
  const date = local?.date ?? new Date().toISOString().split("T")[0];
  const { data, error } = await supabase.from("daily_queue").select("*").eq("date", date).maybeSingle();
  if (error) {
    logSyncError("[sync-extra] pullDailyQueue failed:", error);
    return;
  }
  if (!data) return;
  const row = data as Record<string, unknown>;
  const remoteQueue: DailyQueue = {
    date: String(row.date),
    queue: Array.isArray(row.queue) ? (row.queue as string[]) : [],
    backlog: Array.isArray(row.backlog) ? (row.backlog as string[]) : [],
  };
  writeDailyQueue(remoteQueue);
}

// ---------- Orchestration ----------

let extraSchemaWarningLogged = false;

async function checkExtraSchema(): Promise<boolean> {
  const checks = await Promise.all([
    supabase.from("users").select("password").limit(1),
    supabase.from("shopping_list").select("id").limit(1),
    supabase.from("daily_queue").select("date").limit(1),
  ]);
  const missing = checks.some(
    ({ error }) => error && isSchemaError(error)
  );
  if (missing && !extraSchemaWarningLogged) {
    extraSchemaWarningLogged = true;
    console.warn(
      "[sync-extra] Schema Supabase untuk users.password, shopping_list, atau daily_queue tidak ditemukan. Sync cloud di-skip. Jalankan schema.sql di Supabase target agar sync berjalan."
    );
  }
  return !missing;
}

export async function pushExtra(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  if (!(await checkExtraSchema())) return;
  await Promise.all([pushUsers(), pushShoppingList(), pushDailyQueue()]);
}

export async function pullExtra(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  if (!(await checkExtraSchema())) return;
  await Promise.all([pullUsers(), pullShoppingList(), pullDailyQueue()]);
}

export async function syncExtra(): Promise<void> {
  if (!isOnline()) return;
  if (!isSupabaseConfigured) return;
  if (!(await checkExtraSchema())) return;
  await pushExtra();
  await pullExtra();
}
