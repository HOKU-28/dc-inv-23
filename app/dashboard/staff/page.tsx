"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  PackagePlus,
  Plus,
  ScanBarcode,
  LogOut,
  Sun,
  Moon,
  Trash2,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import { Item, ItemStatus } from "@/app/types";
import {
  addItem,
  addLog,
  archiveItem,
  getActiveItems,
  getDailyQueue,
  getItemStatus,
  getItems,
  getLogs,
  refillDailyQueue,
  saveDailyQueue,
  todayStr,
} from "@/app/lib/data";
import { getSession, logout, requireAuth } from "@/app/lib/auth";
import { syncAll } from "@/app/lib/sync";
import { isOnline } from "@/app/lib/supabase";
import { useOnlineStatus } from "@/app/hooks/use-online-status";
import { DashboardSkeleton } from "@/app/components/skeletons";
import { useTheme } from "@/app/components/theme-provider";
import { BarcodeScanner } from "@/app/components/barcode-scanner";
import { Pagination } from "@/app/components/pagination";
import { usePagination } from "@/app/hooks/use-pagination";
import { toast } from "sonner";

const HOME_ACTIONS = [
  { id: "scan", label: "Scan Barcode", icon: ScanBarcode, color: "bg-orange-500" },
  { id: "check", label: "Cek Stok", icon: ClipboardCheck, color: "bg-blue-500" },
  { id: "in", label: "Stok Masuk", icon: PackagePlus, color: "bg-emerald-500" },
  { id: "add", label: "Tambah Item", icon: Plus, color: "bg-violet-500" },
] as const;

const UNIT_OPTIONS = ["pcs", "kg", "gram", "liter", "ml", "pack", "box", "cup", "slice", "botol"];
const CATEGORY_OPTIONS = ["Bahan", "Kemasan", "Bumbu", "Minuman", "Lainnya"];

type StaffView = "home" | "scan" | "check" | "in" | "add";

function triggerFeedback(type: "success" | "error" = "success") {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(type === "success" ? [30, 60, 30] : [80, 40, 80]);
  }
}

function findItemByBarcode(barcode: string): Item | undefined {
  return getItems().find((item) => item.isActive !== false && item.barcode === barcode);
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const online = useOnlineStatus();
  const [mounted, setMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [view, setView] = useState<StaffView>("home");
  const [items, setItems] = useState<Item[]>([]);
  const [statuses, setStatuses] = useState<ItemStatus[]>([]);
  const [scannedItemId, setScannedItemId] = useState<string | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  const refresh = () => {
    const activeItems = getActiveItems();
    const logs = getLogs();
    setItems(activeItems);
    setStatuses(activeItems.map((item) => getItemStatus(item, logs)));
  };

  useEffect(() => {
    const session = requireAuth("staff");
    if (!session) {
      router.replace("/");
      return;
    }

    const init = async () => {
      if (isOnline()) {
        await syncAll().catch((err) => console.error("[staff] initial sync failed:", err));
      }
      refresh();
      setMounted(true);
      setInitialLoading(false);
    };

    init();
  }, [router]);

  useEffect(() => {
    if (mounted && online) {
      syncAll().then(() => refresh()).catch((err) => console.error("[staff] syncAll failed:", err));
    }
  }, [online, mounted]);

  const handleLogout = () => {
    logout();
    toast.info("Anda telah keluar.");
    router.replace("/");
  };

  const goHome = () => {
    setScannedItemId(null);
    setScannedBarcode(null);
    setView("home");
  };

  const handleScan = (barcode: string) => {
    triggerFeedback("success");
    const item = findItemByBarcode(barcode);
    if (item) {
      setScannedItemId(item.id);
      setScannedBarcode(barcode);
      toast.success(`Barcode ditemukan: ${item.name}`);
    } else {
      setScannedItemId(null);
      setScannedBarcode(barcode);
      toast.info("Barcode tidak ditemukan. Tambahkan item baru.");
    }
  };

  if (!mounted || initialLoading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-4 py-3 sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl flex items-center justify-between">
          {view === "home" ? (
            <div>
              <h1 className="text-lg font-bold leading-tight">Dominico</h1>
              <p className="text-xs text-muted-foreground">{formatToday()}</p>
            </div>
          ) : (
            <button
              onClick={goHome}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground active:opacity-70 min-h-[48px] min-w-[48px]"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
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

      <main className="mx-auto w-full max-w-md px-4 py-6 sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
        {view === "home" && <StaffHome onChangeView={setView} />}
        {view === "scan" && (
          <ScanTask
            scannedItemId={scannedItemId}
            scannedBarcode={scannedBarcode}
            onScan={handleScan}
            onCheck={() => setView("check")}
            onIn={() => setView("in")}
            onAdd={() => setView("add")}
          />
        )}
        {view === "check" && (
          <CheckTask
            statuses={statuses}
            preSelectedItemId={scannedItemId ?? undefined}
            onSaved={() => {
              refresh();
            }}
            onBack={goHome}
          />
        )}
        {view === "in" && (
          <StockInTask
            items={items}
            preSelectedItemId={scannedItemId ?? undefined}
            onSaved={() => {
              refresh();
            }}
            onBack={goHome}
          />
        )}
        {view === "add" && (
          <AddItemTask
            preFilledBarcode={scannedBarcode ?? undefined}
            onSaved={(newItemId) => {
              refresh();
              if (scannedBarcode && newItemId) {
                setScannedItemId(newItemId);
                setView("check");
              } else {
                goHome();
              }
            }}
            onBack={goHome}
          />
        )}
      </main>
    </div>
  );
}

function formatToday() {
  const d = new Date();
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });
}

function StaffHome({ onChangeView }: { onChangeView: (v: StaffView) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold">Pilih tugas</h2>
        <p className="text-sm text-muted-foreground">Ketuk ikon untuk mulai</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {HOME_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onChangeView(action.id)}
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl p-6 text-white shadow-lg active:scale-95 transition-transform min-h-[140px] sm:min-h-[120px] ${action.color}`}
            >
              <Icon className="h-11 w-11" strokeWidth={1.8} />
              <span className="text-base font-bold leading-tight text-center">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScanTask({
  scannedItemId,
  scannedBarcode,
  onScan,
  onCheck,
  onIn,
  onAdd,
}: {
  scannedItemId: string | null;
  scannedBarcode: string | null;
  onScan: (barcode: string) => void;
  onCheck: () => void;
  onIn: () => void;
  onAdd: () => void;
}) {
  const item = scannedItemId ? getItems().find((i) => i.id === scannedItemId) : undefined;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-center">Scan Barcode</h2>

      <div className="max-w-md mx-auto sm:max-w-lg">
        {!scannedBarcode && <BarcodeScanner onScan={onScan} />}

        {scannedBarcode && item && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-5 text-center space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Item ditemukan</p>
              <h3 className="text-2xl font-bold">{item.name}</h3>
              <p className="text-sm text-muted-foreground">
                {item.category} · {item.unit} · {item.barcode}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onIn}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-white p-5 active:scale-95 transition-transform min-h-[120px] sm:min-h-[100px]"
              >
                <PackagePlus className="h-8 w-8" />
                <span className="font-bold">Stok Masuk</span>
              </button>
              <button
                onClick={onCheck}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-blue-500 text-white p-5 active:scale-95 transition-transform min-h-[120px] sm:min-h-[100px]"
              >
                <ClipboardCheck className="h-8 w-8" />
                <span className="font-bold">Cek Stok</span>
              </button>
            </div>

            <Button variant="outline" onClick={() => onScan("")} className="w-full h-12">
              Scan Lagi
            </Button>
          </div>
        )}

        {scannedBarcode && !item && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-amber-50 border-amber-200 p-5 text-center space-y-2">
              <p className="text-sm font-medium text-amber-900">Barcode tidak ditemukan</p>
              <p className="text-lg font-bold text-amber-900">{scannedBarcode}</p>
              <p className="text-xs text-amber-800">Tambahkan sebagai item baru?</p>
            </div>

            <Button onClick={onAdd} className="w-full h-14 sm:h-12 text-lg sm:text-base font-bold">
              Tambah Item Baru
            </Button>

            <Button variant="outline" onClick={() => onScan("")} className="w-full h-12">
              Scan Lagi
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckTask({
  statuses,
  preSelectedItemId,
  onSaved,
  onBack,
}: {
  statuses: ItemStatus[];
  preSelectedItemId?: string;
  onSaved: () => void;
  onBack: () => void;
}) {
  const today = todayStr();
  const [queueData, setQueueData] = useState(() => getDailyQueue());
  const [showBacklog, setShowBacklog] = useState(false);
  const [query, setQuery] = useState("");

  const statusMap = useMemo(() => {
    const map = new Map<string, ItemStatus>();
    statuses.forEach((s) => map.set(s.item.id, s));
    return map;
  }, [statuses]);

  useEffect(() => {
    const current = getDailyQueue();
    if (current.date !== today) {
      const generated = getDailyQueue(today);
      const refilled = refillDailyQueue(today);
      setQueueData(refilled);
      return;
    }
    const refilled = refillDailyQueue(today);
    if (preSelectedItemId && !refilled.queue.includes(preSelectedItemId) && !refilled.backlog.includes(preSelectedItemId)) {
      const selected = statusMap.get(preSelectedItemId);
      if (selected && needsCheck(selected)) {
        const updated = { ...refilled, queue: [preSelectedItemId, ...refilled.queue] };
        saveDailyQueue(updated);
        setQueueData(updated);
        return;
      }
    }
    setQueueData(refilled);
  }, [preSelectedItemId, statusMap, today]);

  const matchesQuery = (item: Item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return !!(
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.barcode && item.barcode.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q))
    );
  };

  const needsCheck = (s: ItemStatus): boolean => {
    if (s.lastCheckDate === today) return false;
    return !!(s.currentStock <= 0 || s.isLow || s.isOverdue || (s.nextCheckDate && s.nextCheckDate <= today));
  };

  const rawQueueRemaining = useMemo(() => {
    return queueData.queue
      .map((id) => statusMap.get(id))
      .filter((s): s is ItemStatus => !!s && needsCheck(s));
  }, [queueData, statusMap, today]);

  const queueStatuses = useMemo(() => {
    return queueData.queue
      .map((id) => statusMap.get(id))
      .filter((s): s is ItemStatus => !!s && needsCheck(s) && matchesQuery(s.item));
  }, [queueData, statusMap, today, query]);

  const backlogStatuses = useMemo(() => {
    return queueData.backlog
      .map((id) => statusMap.get(id))
      .filter((s): s is ItemStatus => !!s && needsCheck(s) && matchesQuery(s.item));
  }, [queueData, statusMap, today, query]);

  const otherStatuses = useMemo(() => {
    if (!query.trim()) return [];
    const queuedIds = new Set([...queueData.queue, ...queueData.backlog]);
    return statuses.filter((s) => matchesQuery(s.item) && !queuedIds.has(s.item.id));
  }, [statuses, query, queueData]);

  const {
    currentPage,
    setCurrentPage,
    totalItems,
    totalPages,
    paginatedData,
    startIndex,
    endIndex,
  } = usePagination(queueStatuses, { pageSize: 6 });

  const handleSaved = () => {
    onSaved();
    const refilled = refillDailyQueue(today);
    setQueueData(refilled);
  };

  const allEmpty = queueStatuses.length === 0 && backlogStatuses.length === 0 && otherStatuses.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cek Stok</h2>
        <Badge variant="secondary" className="text-sm px-3 py-1">{rawQueueRemaining.length}/10 tugas</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Cari item, kategori, barcode..."
          className="pl-9 h-12"
        />
      </div>

      {rawQueueRemaining.length === 0 && !query.trim() && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center text-green-900 dark:bg-green-950 dark:border-green-900 dark:text-green-100">
          <p className="font-bold">Tugas harian selesai ✓</p>
          <p className="text-sm opacity-80">Semua item utama sudah dicek. Kerjakan backlog atau cari item lain jika perlu.</p>
        </div>
      )}

      {queueStatuses.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedData.map((status) => (
              <CheckCard key={status.item.id} status={status} onSaved={handleSaved} />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {backlogStatuses.length > 0 && (
        <div className="space-y-3 pt-2">
          <button
            onClick={() => setShowBacklog((v) => !v)}
            className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-100 flex items-center justify-between"
          >
            <span className="font-bold text-sm">{backlogStatuses.length} item lain perlu dicek (backlog)</span>
            <span className="text-sm font-semibold">{showBacklog ? "Sembunyikan ↑" : "Kerjakan →"}</span>
          </button>

          {showBacklog && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {backlogStatuses.map((status) => (
                <CheckCard key={status.item.id} status={status} onSaved={handleSaved} />
              ))}
            </div>
          )}
        </div>
      )}

      {otherStatuses.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-100">
            <p className="font-bold text-sm">{otherStatuses.length} item lain dari pencarian</p>
            <p className="text-xs opacity-80">Item yang cocok dengan pencarian, termasuk yang sudah dicek hari ini.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherStatuses.map((status) => (
              <CheckCard key={status.item.id} status={status} onSaved={handleSaved} />
            ))}
          </div>
        </div>
      )}

      {allEmpty && query.trim() && (
        <div className="text-center space-y-3 py-10">
          <h3 className="text-lg font-bold">Tidak ada hasil pencarian</h3>
          <p className="text-sm text-muted-foreground">Item yang dicari tidak ditemukan.</p>
          <Button onClick={() => setQuery("")} className="min-h-[48px] px-8">Bersihkan Pencarian</Button>
        </div>
      )}
    </div>
  );
}

function CheckCard({ status, onSaved }: { status: ItemStatus; onSaved: () => void }) {
  const [qty, setQty] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const num = Number(qty);
    if (!qty || num < 0) return;
    setSaving(true);
    const session = getSession();
    addLog({
      itemId: status.item.id,
      type: "check",
      qty: num,
      date: todayStr(),
      recordedBy: session?.name,
    });
    setSaving(false);
    setSaved(true);
    triggerFeedback("success");
    toast.success(`Cek stok ${status.item.name} tersimpan.`);
    onSaved();
    setTimeout(() => {
      setSaved(false);
      setQty("");
      inputRef.current?.focus();
    }, 900);
  };

  const handleDelete = () => {
    if (!confirm(`Hapus item "${status.item.name}"? Item yang sudah dihapus tidak akan muncul lagi di daftar aktif.`)) return;
    setDeleting(true);
    try {
      archiveItem(status.item.id);
      const session = getSession();
      addLog({
        itemId: status.item.id,
        type: "archive",
        qty: 0,
        date: todayStr(),
        recordedBy: session?.name,
        note: "Item dihapus/diarsipkan",
      });
      toast.success(`"${status.item.name}" berhasil dihapus.`);
      onSaved();
    } catch {
      toast.error("Gagal menghapus item.");
    } finally {
      setDeleting(false);
    }
  };

  const urgent = status.isOverdue;
  const dueToday = status.nextCheckDate === todayStr();
  const dueTomorrow = status.nextCheckDate === addDays(todayStr(), 1);
  const isOutOfStock = status.currentStock <= 0;
  const isLowStock = !isOutOfStock && status.isLow;

  return (
    <div className={`rounded-2xl border bg-card p-4 space-y-3 transition-colors ${isOutOfStock ? "border-red-300 bg-red-50/30 dark:bg-red-950/20" : isLowStock ? "border-orange-300 bg-orange-50/30 dark:bg-orange-950/20" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-tight">{status.item.name}</h3>
          <p className="text-xs text-muted-foreground">{status.item.category}</p>
          {status.item.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {status.item.location}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end max-w-[55%]">
          {isOutOfStock && <Badge variant="destructive" className="text-xs">Habis</Badge>}
          {isLowStock && <Badge className="text-xs bg-orange-500 text-white dark:bg-orange-600">Menipis</Badge>}
          {urgent && <Badge variant="outline" className="text-xs">Lewat</Badge>}
          {dueToday && !urgent && <Badge variant="secondary" className="text-xs bg-amber-500 text-white dark:bg-amber-700">Hari ini</Badge>}
          {dueTomorrow && !urgent && !dueToday && <Badge className="text-xs bg-blue-500 text-white dark:bg-blue-600">Besok</Badge>}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Hapus item"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Sisa: <span className="font-bold text-foreground">{status.currentStock}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Min: <span className="font-bold text-foreground">{status.item.minStock}</span>
        </div>
      </div>

      <Input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        min={0}
        placeholder={`Jumlah ${status.item.unit}`}
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className="h-14 sm:h-12 text-lg sm:text-base text-center font-semibold"
      />

      <Button
        onClick={handleSave}
        disabled={saving || saved || !qty || Number(qty) < 0}
        className={`w-full h-14 sm:h-12 text-lg sm:text-base font-bold transition-colors ${saved ? "bg-green-600 hover:bg-green-600" : ""}`}
      >
        {saved ? "Tersimpan ✓" : saving ? "Menyimpan..." : "Simpan"}
      </Button>
    </div>
  );
}

function StockInTask({
  items,
  preSelectedItemId,
  onSaved,
  onBack,
}: {
  items: Item[];
  preSelectedItemId?: string;
  onSaved: () => void;
  onBack: () => void;
}) {
  const activeItems = useMemo(() => items.filter((i) => i.isActive !== false), [items]);
  const [itemId, setItemId] = useState(preSelectedItemId || "");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setItemId(preSelectedItemId || "");
  }, [preSelectedItemId]);

  const selectedItem = useMemo(() => activeItems.find((i) => i.id === itemId), [activeItems, itemId]);

  const canSave = itemId && qty && Number(qty) > 0;

  const handleSave = () => {
    if (!canSave) return;
    setSaving(true);
    const session = getSession();
    addLog({
      itemId,
      type: "in",
      qty: Number(qty),
      date,
      recordedBy: session?.name,
    });
    setSaving(false);
    setSaved(true);
    triggerFeedback("success");
    const itemName = items.find((i) => i.id === itemId)?.name || "Item";
    toast.success(`Stok masuk ${itemName} tersimpan.`);
    onSaved();
    setTimeout(() => {
      setSaved(false);
      setQty("");
      setDate(todayStr());
    }, 900);
  };

  return (
    <div className="space-y-5 max-w-md sm:max-w-2xl mx-auto">
      <h2 className="text-xl font-bold">Stok Masuk</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Item</label>
        <Select value={itemId} onValueChange={(v) => setItemId(v ?? "")}>
          <SelectTrigger className="h-14 sm:h-12 text-base">
            <SelectValue placeholder="Pilih item">{selectedItem?.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {activeItems.map((item) => (
              <SelectItem key={item.id} value={item.id} className="text-base">
                {item.name} ({item.unit})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Jumlah</label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="h-14 sm:h-12 text-lg sm:text-base text-center font-semibold"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Tanggal</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-14 sm:h-12 text-base text-center"
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={!canSave || saving || saved}
        className={`w-full h-14 sm:h-12 text-lg sm:text-base font-bold ${saved ? "bg-green-600 hover:bg-green-600" : ""}`}
      >
        {saved ? "Tersimpan ✓" : saving ? "Menyimpan..." : "Simpan Masuk"}
      </Button>

      <Button variant="outline" onClick={onBack} className="w-full h-12 text-base">
        Batal
      </Button>
    </div>
  );
}

function AddItemTask({
  preFilledBarcode,
  onSaved,
  onBack,
}: {
  preFilledBarcode?: string;
  onSaved?: (newItemId?: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [category, setCategory] = useState("Bahan");
  const [minStock, setMinStock] = useState("");
  const [frequencyValue, setFrequencyValue] = useState<string>("");
  const [frequencyUnit, setFrequencyUnit] = useState<"hari" | "minggu">("hari");
  const frequencyDays = useMemo(() => {
    const val = frequencyValue === "" ? 1 : Number(frequencyValue);
    return frequencyUnit === "hari" ? val : val * 7;
  }, [frequencyValue, frequencyUnit]);
  const [barcode, setBarcode] = useState(preFilledBarcode || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBarcode(preFilledBarcode || "");
  }, [preFilledBarcode]);

  const canSave = name.trim() && unit.trim() && category.trim() && minStock && Number(minStock) >= 0;

  const handleSave = () => {
    if (!canSave) return;
    setSaving(true);
    const newItem = addItem({
      name: name.trim(),
      unit: unit.trim(),
      category: category.trim(),
      minStock: Number(minStock),
      checkFrequencyDays: frequencyDays,
      barcode: barcode.trim() || undefined,
    });
    const session = getSession();
    addLog({
      itemId: newItem.id,
      type: "add",
      qty: 0,
      date: todayStr(),
      recordedBy: session?.name,
      note: "Item baru ditambahkan",
    });
    setSaving(false);
    setSaved(true);
    triggerFeedback("success");
    toast.success(`Item ${newItem.name} berhasil ditambahkan.`);
    onSaved?.(newItem.id);
    setTimeout(() => {
      setSaved(false);
      setName("");
      setMinStock("");
      setFrequencyValue("");
      setFrequencyUnit("hari");
      setBarcode("");
    }, 900);
  };

  return (
    <div className="space-y-5 max-w-md sm:max-w-2xl mx-auto">
      <h2 className="text-xl font-bold">Tambah Item</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Nama</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Cup Kopi"
          className="h-14 sm:h-12 text-base"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Satuan</label>
          <Select value={unit} onValueChange={(v) => setUnit(v ?? "pcs")}>
            <SelectTrigger className="h-14 sm:h-12 text-base">
              <SelectValue placeholder="Pilih" />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((u) => (
                <SelectItem key={u} value={u} className="text-base">
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Kategori</label>
          <Select value={category} onValueChange={(v) => setCategory(v ?? "Bahan")}>
            <SelectTrigger className="h-14 sm:h-12 text-base">
              <SelectValue placeholder="Pilih" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c} className="text-base">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Stok Minimal</label>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            placeholder="0"
            className="h-14 sm:h-12 text-lg sm:text-base text-center font-semibold"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Cek Setiap</label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={frequencyValue}
              placeholder="0"
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^[0-9]*$/.test(val)) {
                  setFrequencyValue(val);
                }
              }}
              className="h-14 sm:h-12 text-lg sm:text-base text-center font-semibold"
            />
            <Select value={frequencyUnit} onValueChange={(v) => setFrequencyUnit(v as "hari" | "minggu")}>
              <SelectTrigger className="h-14 sm:h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hari" className="text-base">hari</SelectItem>
                <SelectItem value="minggu" className="text-base">minggu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Barcode</label>
        <Input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Ketik barcode"
          className="h-14 sm:h-12 text-base"
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={!canSave || saving || saved}
        className={`w-full h-14 sm:h-12 text-lg sm:text-base font-bold ${saved ? "bg-green-600 hover:bg-green-600" : ""}`}
      >
        {saved ? "Tersimpan ✓" : saving ? "Menyimpan..." : "Simpan Item"}
      </Button>

      <Button variant="outline" onClick={onBack} className="w-full h-12 text-base">
        Batal
      </Button>
    </div>
  );
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
