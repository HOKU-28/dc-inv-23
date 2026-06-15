"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  AlertCircle,
  Users,
  Trash2,
  Loader2,
  ShoppingCart,
  TrendingUp,
  PackageCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileDown,
} from "lucide-react";
import { ItemStatus, StockLog } from "@/app/types";
import {
  deleteLog,
  formatDate,
  getDailyUsage,
  getISOWeek,
  getItems,
  getMonthlyUsage,
  getWeeklyUsage,
  getYearlyUsage,
  todayStr,
} from "@/app/lib/data";
import {
  addToShoppingById,
  clearShoppingList,
  getShoppingIds,
  removeFromShoppingById,
} from "@/app/lib/shopping-list";
import { toast } from "sonner";

export function OwnerDashboard({
  statuses,
  logs,
}: {
  statuses: ItemStatus[];
  logs: StockLog[];
}) {
  const [drillDown, setDrillDown] = useState<"habis" | "menipis" | "shopping" | "staff" | null>(null);
  const [expandedGood, setExpandedGood] = useState(false);
  const [shoppingIds, setShoppingIds] = useState<string[]>([]);

  useEffect(() => {
    setShoppingIds(getShoppingIds());
  }, []);

  const refreshShopping = () => setShoppingIds(getShoppingIds());

  const rawHabisItems = statuses.filter((s) => s.currentStock <= 0 || s.isOverdue);
  const rawMenipisItems = statuses.filter(
    (s) =>
      s.currentStock > 0 &&
      !s.isOverdue &&
      (s.isLow || s.currentStock <= s.item.minStock * 0.5)
  );

  // Hapus item dari daftar belanja yang sudah tidak habis/menipis lagi
  useEffect(() => {
    const activeIds = new Set([
      ...rawHabisItems.map((s) => s.item.id),
      ...rawMenipisItems.map((s) => s.item.id),
    ]);
    const keepIds = shoppingIds.filter((id) => activeIds.has(id));
    if (keepIds.length !== shoppingIds.length) {
      const removed = shoppingIds.filter((id) => !activeIds.has(id));
      removed.forEach((id) => removeFromShoppingById(id));
      setShoppingIds(keepIds);
    }
  }, [shoppingIds, rawHabisItems, rawMenipisItems]);

  const notInShopping = statuses.filter((s) => !shoppingIds.includes(s.item.id));

  const habisItems = notInShopping.filter((s) => rawHabisItems.some((h) => h.item.id === s.item.id));
  const menipisItems = notInShopping.filter((s) => rawMenipisItems.some((m) => m.item.id === s.item.id));

  const goodItems = statuses.filter((s) => !s.isLow && !s.isOverdue);

  const hasActions = habisItems.length > 0 || menipisItems.length > 0;

  if (drillDown === "shopping") {
    return <ShoppingListDrillDown onBack={() => { setDrillDown(null); refreshShopping(); }} />;
  }
  if (drillDown === "habis") {
    return <HabisDrillDown items={habisItems} onBack={() => setDrillDown(null)} onRefresh={refreshShopping} />;
  }
  if (drillDown === "menipis") {
    return <MenipisDrillDown items={menipisItems} onBack={() => setDrillDown(null)} onRefresh={refreshShopping} />;
  }
  if (drillDown === "staff") {
    return <StaffDrillDown logs={logs} onBack={() => setDrillDown(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1 py-2">
        <p className="text-sm text-muted-foreground">{formatToday()}</p>
        <h2 className="text-2xl font-bold">Ringkasan Stok</h2>
      </div>

      {!hasActions && (
        <ZeroStateCard goodCount={goodItems.length} />
      )}

      {shoppingIds.length > 0 && (
        <ShoppingListSection count={shoppingIds.length} onDrillDown={() => setDrillDown("shopping")} />
      )}

      {habisItems.length > 0 && (
        <HabisSection items={habisItems} onDrillDown={() => setDrillDown("habis")} onMoved={refreshShopping} />
      )}

      {menipisItems.length > 0 && (
        <MenipisSection items={menipisItems} onDrillDown={() => setDrillDown("menipis")} onMoved={refreshShopping} />
      )}

      <InsightSection statuses={statuses} logs={logs} />

      <RekapSection statuses={statuses} logs={logs} />

      <StaffSection logs={logs} onDrillDown={() => setDrillDown("staff")} />

      <AllGoodSection items={goodItems} expanded={expandedGood} onToggle={() => setExpandedGood((v) => !v)} />
    </div>
  );
}

function formatToday() {
  const d = new Date();
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });
}

// ---------- Section cards ----------

function ZeroStateCard({ goodCount }: { goodCount: number }) {
  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center space-y-3 text-green-950 dark:bg-green-950 dark:border-green-900 dark:text-green-100">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-300" />
      </div>
      <div>
        <h3 className="text-xl font-bold">Semua Stok Aman Hari Ini</h3>
        <p className="text-sm opacity-80 mt-1">Tidak ada tindakan yang perlu dilakukan</p>
      </div>
      {goodCount > 0 && (
        <p className="text-xs opacity-70">{goodCount} item dalam kondisi aman</p>
      )}
    </div>
  );
}

function ShoppingListSection({ count, onDrillDown }: { count: number; onDrillDown: () => void }) {
  return (
    <div
      onClick={onDrillDown}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onDrillDown()}
      className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-purple-950 transition-transform active:scale-[0.98] dark:bg-purple-950 dark:border-purple-900 dark:text-purple-100"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
          <ShoppingCart className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold leading-tight">{count} item di daftar belanja</h3>
          <p className="text-sm opacity-80">Siap dipesan ke supplier</p>
        </div>
        <span className="text-sm font-semibold opacity-80">→</span>
      </div>
    </div>
  );
}

function HabisSection({
  items,
  onDrillDown,
  onMoved,
}: {
  items: ItemStatus[];
  onDrillDown: () => void;
  onMoved: () => void;
}) {
  const visible = items.slice(0, 3);

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3 text-red-950 dark:bg-red-950 dark:border-red-900 dark:text-red-100">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold leading-tight">{items.length} item habis</h3>
          <p className="text-sm opacity-80">Pesan segera agar operasional tidak terganggu</p>
        </div>
      </div>

      <div className="space-y-2">
        {visible.map((s) => (
          <div
            key={s.item.id}
            className="rounded-xl border border-red-200 bg-white/60 dark:bg-red-950/30 dark:border-red-900 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold">{s.item.name}</p>
                <p className="text-xs opacity-80">Sisa {s.currentStock} {s.item.unit}</p>
              </div>
              <Button
                size="sm"
                className="h-10 px-3 bg-red-600 hover:bg-red-700 text-white shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  addToShoppingById(s.item.id, s.item.name);
                  onMoved();
                }}
              >
                Pesan Sekarang
              </Button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 3 && (
        <button
          onClick={onDrillDown}
          className="w-full text-center text-sm font-semibold text-red-700 dark:text-red-200 py-2"
        >
          Lihat {items.length - 3} item lainnya →
        </button>
      )}
    </div>
  );
}

function MenipisSection({
  items,
  onDrillDown,
  onMoved,
}: {
  items: ItemStatus[];
  onDrillDown: () => void;
  onMoved: () => void;
}) {
  const visible = items.slice(0, 3);

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 space-y-3 text-orange-950 dark:bg-orange-950 dark:border-orange-900 dark:text-orange-100">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold leading-tight">{items.length} item mulai menipis</h3>
          <p className="text-sm opacity-80">Pertimbangkan untuk dibeli minggu ini</p>
        </div>
      </div>

      <div className="space-y-2">
        {visible.map((s) => (
          <div
            key={s.item.id}
            className="rounded-xl border border-orange-200 bg-white/60 dark:bg-orange-950/30 dark:border-orange-900 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold">{s.item.name}</p>
                <p className="text-xs opacity-80">Sisa {s.currentStock} {s.item.unit}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-10 px-3 border-orange-500 text-orange-700 hover:bg-orange-100 dark:text-orange-100 dark:hover:bg-orange-900 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  addToShoppingById(s.item.id, s.item.name);
                  onMoved();
                }}
              >
                + Daftar Belanja
              </Button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 3 && (
        <button
          onClick={onDrillDown}
          className="w-full text-center text-sm font-semibold text-orange-700 dark:text-orange-200 py-2"
        >
          Lihat {items.length - 3} item lainnya →
        </button>
      )}
    </div>
  );
}

type Period = "daily" | "weekly" | "monthly" | "yearly";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
};

function PeriodTabs({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex items-center gap-1 bg-background/50 rounded-lg p-1">
      {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
        <button
          key={p}
          onClick={(e) => {
            e.stopPropagation();
            onChange(p);
          }}
          className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            value === p
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

function getInsightForPeriod(statuses: ItemStatus[], logs: StockLog[], period: Period) {
  const today = todayStr();
  const year = Number(today.split("-")[0]);
  const month = Number(today.split("-")[1]);
  const week = getISOWeek(today);

  let list: { item: ItemStatus["item"]; used: number; in: number }[] = [];

  statuses.forEach((s) => {
    let usage;
    if (period === "daily") usage = getDailyUsage(s.item.id, today, logs);
    else if (period === "weekly") usage = getWeeklyUsage(s.item.id, year, week, logs);
    else if (period === "monthly") usage = getMonthlyUsage(s.item.id, year, month, logs);
    else usage = getYearlyUsage(s.item.id, year, logs);

    list.push({ item: s.item, used: usage.used, in: usage.totalIn });
  });

  list = list.filter((x) => x.used > 0 || x.in > 0).sort((a, b) => b.used - a.used);
  return list;
}

function InsightSection({ statuses, logs }: { statuses: ItemStatus[]; logs: StockLog[] }) {
  const [period, setPeriod] = useState<Period>("weekly");
  const [expanded, setExpanded] = useState(false);

  const data = useMemo(() => getInsightForPeriod(statuses, logs, period), [statuses, logs, period]);
  const top = data[0];

  if (!top) return null;

  const chartData = data.slice(0, 5).map((d) => ({
    name: d.item.name,
    terpakai: Math.round(d.used),
  }));

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-100">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 shrink-0">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold leading-tight">
            {top.item.name} paling laris
          </h3>
          <p className="text-sm opacity-80 mt-1">
            {PERIOD_LABELS[period]}: terpakai {Math.round(top.used)} {top.item.unit}
          </p>
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <PeriodTabs value={period} onChange={setPeriod} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="mt-3 text-sm font-semibold text-blue-700 dark:text-blue-200 flex items-center gap-1"
          >
            {expanded ? "Sembunyikan" : "Detail Lengkap"} {expanded ? "↑" : "→"}
          </button>

          {expanded && (
            <div className="mt-4 space-y-3">
              <div className="h-48 w-full rounded-xl bg-white/60 dark:bg-blue-950/40 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, className: "dark:fill-white" }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={50}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, className: "dark:fill-white" }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={{ stroke: "var(--border)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        color: "var(--muted-foreground)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="terpakai" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs opacity-80">
                Grafik menunjukkan 5 item paling banyak terpakai dalam periode {PERIOD_LABELS[period].toLowerCase()}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RekapSection({ statuses, logs }: { statuses: ItemStatus[]; logs: StockLog[] }) {
  const [period, setPeriod] = useState<Period>("weekly");
  const [expanded, setExpanded] = useState(false);

  const data = useMemo(() => getInsightForPeriod(statuses, logs, period), [statuses, logs, period]);

  const totals = data.reduce(
    (acc, d) => {
      acc.in += d.in;
      acc.used += d.used;
      return acc;
    },
    { in: 0, used: 0 }
  );

  const net = totals.in - totals.used;

  const exportCSV = () => {
    const rows = [
      ["Item", "Satuan", "Stok Masuk", "Terpakai", "Netto"],
      ...data.map((d) => [d.item.name, d.item.unit, String(d.in), String(Math.round(d.used)), String(d.in - Math.round(d.used))]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekap-${period}-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rekap diexport.");
  };

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-950 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-100">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 shrink-0">
          <PackageCheck className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold leading-tight">
            Rekap {PERIOD_LABELS[period]}
          </h3>
          <p className="text-sm opacity-80 mt-1">
            {net >= 0 ? "+" : ""}{Math.round(net)} unit aktivitas bersih
          </p>
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <PeriodTabs value={period} onChange={setPeriod} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="mt-3 text-sm font-semibold text-indigo-700 dark:text-indigo-200 flex items-center gap-1"
          >
            {expanded ? "Sembunyikan" : "Detail Lengkap"} {expanded ? "↑" : "→"}
          </button>

          {expanded && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/60 dark:bg-indigo-950/40 p-2">
                  <p className="text-xs opacity-70">Masuk</p>
                  <p className="font-bold">{Math.round(totals.in)}</p>
                </div>
                <div className="rounded-lg bg-white/60 dark:bg-indigo-950/40 p-2">
                  <p className="text-xs opacity-70">Terpakai</p>
                  <p className="font-bold">{Math.round(totals.used)}</p>
                </div>
                <div className="rounded-lg bg-white/60 dark:bg-indigo-950/40 p-2">
                  <p className="text-xs opacity-70">Netto</p>
                  <p className={`font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>{net >= 0 ? "+" : ""}{Math.round(net)}</p>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {data.slice(0, 10).map((d) => (
                  <div
                    key={d.item.id}
                    className="flex items-center justify-between text-sm rounded-lg bg-white/60 dark:bg-indigo-950/40 p-2"
                  >
                    <span className="truncate flex-1">{d.item.name}</span>
                    <span className="opacity-70 text-xs mr-3">+{Math.round(d.in)} / -{Math.round(d.used)}</span>
                    <span className={`font-semibold ${d.in - d.used >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {d.in - d.used >= 0 ? "+" : ""}{Math.round(d.in - d.used)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10 border-indigo-500 text-indigo-700 hover:bg-indigo-100 dark:text-indigo-100 dark:hover:bg-indigo-900"
                  onClick={exportCSV}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10 border-indigo-500 text-indigo-700 hover:bg-indigo-100 dark:text-indigo-100 dark:hover:bg-indigo-900"
                  onClick={() => toast.info("Export PDF akan segera hadir.")}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  Export PDF
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StaffSection({ logs, onDrillDown }: { logs: StockLog[]; onDrillDown: () => void }) {
  const today = todayStr();
  const hasCheckToday = logs.some((l) => l.type === "check" && l.date === today);

  return (
    <div
      onClick={onDrillDown}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onDrillDown()}
      className="rounded-xl border bg-muted/50 p-3 text-muted-foreground transition-transform active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5" />
          <p className="text-sm font-medium">
            {hasCheckToday ? "Pengecekan harian telah dilakukan" : "Pengecekan harian belum tercatat"}
          </p>
        </div>
        <span className="text-xs font-semibold opacity-80">Detail Lengkap →</span>
      </div>
    </div>
  );
}

function AllGoodSection({
  items,
  expanded,
  onToggle,
}: {
  items: ItemStatus[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 text-green-900 dark:bg-green-950/30 dark:border-green-900 dark:text-green-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-sm"
      >
        <span className="font-medium flex items-center gap-2">
          <PackageCheck className="h-4 w-4" />
          {items.length} item aman
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {items.slice(0, 4).map((s) => (
            <div
              key={s.item.id}
              className="flex items-center justify-between text-sm rounded-lg bg-white/60 dark:bg-green-950/40 p-2"
            >
              <span>{s.item.name}</span>
              <span className="opacity-70">{s.currentStock} {s.item.unit}</span>
            </div>
          ))}
          {items.length > 4 && (
            <p className="text-xs text-center opacity-70">+{items.length - 4} item aman lainnya</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Drill-downs ----------

function DrillDownHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );
}

function HabisDrillDown({
  items,
  onBack,
  onRefresh,
}: {
  items: ItemStatus[];
  onBack: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <DrillDownHeader title="Item Habis" onBack={onBack} />
      {items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Tidak ada item habis.</p>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Card
              key={s.item.id}
              className="border-red-200 bg-red-50 text-red-950 dark:bg-red-950 dark:border-red-900 dark:text-red-100"
            >
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold">{s.item.name}</h3>
                  <p className="text-xs opacity-80">Sisa {s.currentStock} {s.item.unit}</p>
                </div>
                <Button
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    addToShoppingById(s.item.id, s.item.name);
                    onRefresh();
                  }}
                >
                  Pesan Sekarang
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MenipisDrillDown({
  items,
  onBack,
  onRefresh,
}: {
  items: ItemStatus[];
  onBack: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <DrillDownHeader title="Item Menipis" onBack={onBack} />
      {items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Tidak ada item menipis.</p>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Card
              key={s.item.id}
              className="border-orange-200 bg-orange-50 text-orange-950 dark:bg-orange-950 dark:border-orange-900 dark:text-orange-100"
            >
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold">{s.item.name}</h3>
                  <p className="text-xs opacity-80">Sisa {s.currentStock} {s.item.unit}</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-12 border-orange-500 text-orange-700 hover:bg-orange-100 dark:text-orange-100 dark:hover:bg-orange-900"
                  onClick={() => {
                    addToShoppingById(s.item.id, s.item.name);
                    onRefresh();
                  }}
                >
                  Tambah ke Daftar Belanja
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ShoppingListDrillDown({ onBack }: { onBack: () => void }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(getShoppingIds());
  }, []);

  const itemMap = useMemo(() => {
    const map = new Map<string, string>();
    getItems().forEach((item) => map.set(item.id, item.name));
    return map;
  }, []);

  const handleRemove = (id: string) => {
    removeFromShoppingById(id);
    setIds(getShoppingIds());
  };

  const handleClear = () => {
    clearShoppingList();
    setIds([]);
    toast.info("Daftar belanja dikosongkan.");
  };

  return (
    <div className="space-y-4">
      <DrillDownHeader title="Daftar Belanja" onBack={onBack} />

      {ids.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Daftar belanja kosong.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {ids.map((id) => (
              <Card key={id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="font-bold">{itemMap.get(id) || id}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => handleRemove(id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button variant="outline" className="w-full" onClick={handleClear}>
            Kosongkan Daftar
          </Button>
        </>
      )}
    </div>
  );
}

function StaffDrillDown({ logs, onBack }: { logs: StockLog[]; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const today = todayStr();

  const itemMap = useMemo(() => {
    const map = new Map<string, string>();
    getItems().forEach((item) => map.set(item.id, item.name));
    return map;
  }, []);

  const recentChecks = logs
    .filter((l) => l.type === "check")
    .sort((a, b) => b.createdAt - a.createdAt);

  const filtered = recentChecks.filter((l) => {
    if (!search.trim()) return true;
    const name = (itemMap.get(l.itemId) || "").toLowerCase();
    return name.includes(search.toLowerCase()) || (l.recordedBy || "").toLowerCase().includes(search.toLowerCase());
  });

  const handleDelete = (id: string) => {
    if (!confirm("Hapus catatan ini?")) return;
    setDeletingId(id);
    try {
      deleteLog(id);
      toast.success("Catatan dihapus.");
    } catch {
      toast.error("Gagal menghapus.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <DrillDownHeader title="Aktivitas Staff" onBack={onBack} />
      <Input
        placeholder="Cari item atau staff..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-12"
      />
      <div className="space-y-3">
        {filtered.slice(0, 20).map((log) => (
          <Card key={log.id} className={log.date === today ? "border-primary" : ""}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{itemMap.get(log.itemId) || log.itemId}</h3>
                <p className="text-xs text-muted-foreground">
                  {log.recordedBy || "Staff"} · {formatDate(log.date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{log.qty}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => handleDelete(log.id)}
                  disabled={deletingId === log.id}
                >
                  {deletingId === log.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export const OwnerTab = OwnerDashboard;
