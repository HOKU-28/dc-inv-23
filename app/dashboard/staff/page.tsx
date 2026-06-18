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
} from "lucide-react";
import { Item, ItemStatus } from "@/app/types";
import {
  addItem,
  addLog,
  archiveItem,
  getActiveItems,
  getItemStatus,
  getItems,
  getLogs,
  todayStr,
} from "@/app/lib/data";
import { getSession, logout, requireAuth } from "@/app/lib/auth";
import { DashboardSkeleton } from "@/app/components/skeletons";
import { useTheme } from "@/app/components/theme-provider";
import { BarcodeScanner } from "@/app/components/barcode-scanner";
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
  const [mounted, setMounted] = useState(false);
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
    setMounted(true);
    refresh();
  }, [router]);

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

  if (!mounted) return <DashboardSkeleton />;

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
              goHome();
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
              goHome();
            }}
            onBack={goHome}
          />
        )}
        {view === "add" && (
          <AddItemTask
            preFilledBarcode={scannedBarcode ?? undefined}
            onSaved={() => {
              refresh();
              goHome();
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
  const sorted = useMemo(() => {
    const tomorrow = addDays(today, 1);
    let list = [...statuses]
      .filter(
        (s) =>
          (s.nextCheckDate && s.nextCheckDate <= tomorrow) ||
          s.currentStock <= 0 ||
          s.isLow
      )
      .sort((a, b) => {
        const priority = (s: ItemStatus) => {
          if (s.currentStock <= 0) return 0; // habis
          if (s.isLow) return 1; // menipis
          if (s.isOverdue) return 2;
          if (s.nextCheckDate === today) return 3;
          if (s.nextCheckDate === tomorrow) return 4;
          return 5;
        };
        const diff = priority(a) - priority(b);
        if (diff !== 0) return diff;
        return a.item.name.localeCompare(b.item.name);
      });

    if (preSelectedItemId) {
      const selected = list.find((s) => s.item.id === preSelectedItemId);
      if (selected) {
        list = [selected, ...list.filter((s) => s.item.id !== preSelectedItemId)];
      }
    }
    return list;
  }, [statuses, today, preSelectedItemId]);

  if (sorted.length === 0) {
    return (
      <div className="text-center space-y-4 py-12">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Semua sudah dicek</h2>
        <p className="text-sm text-muted-foreground">Tidak ada item yang perlu dicek hari ini.</p>
        <Button onClick={onBack} className="min-h-[48px] px-8">Kembali</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cek Stok</h2>
        <Badge variant="secondary" className="text-sm px-3 py-1">{sorted.length} item</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((status) => (
          <CheckCard key={status.item.id} status={status} onSaved={onSaved} />
        ))}
      </div>
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
        <div>
          <h3 className="text-lg font-bold leading-tight">{status.item.name}</h3>
          <p className="text-xs text-muted-foreground">{status.item.category}</p>
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
            <SelectValue placeholder="Pilih item" />
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
  onSaved: () => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [category, setCategory] = useState("Bahan");
  const [minStock, setMinStock] = useState("");
  const [frequency, setFrequency] = useState<1 | 7>(1);
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
      checkFrequencyDays: frequency,
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
    onSaved();
    setTimeout(() => {
      setSaved(false);
      setName("");
      setMinStock("");
      setFrequency(1);
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
            <button
              type="button"
              onClick={() => setFrequency(1)}
              className={`h-14 sm:h-12 rounded-xl text-base font-semibold border transition-colors ${frequency === 1 ? "bg-foreground text-background" : "bg-background text-foreground opacity-50"}`}
            >
              Harian
            </button>
            <button
              type="button"
              onClick={() => setFrequency(7)}
              className={`h-14 sm:h-12 rounded-xl text-base font-semibold border transition-colors ${frequency === 7 ? "bg-foreground text-background" : "bg-background text-foreground opacity-50"}`}
            >
              Mingguan
            </button>
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
