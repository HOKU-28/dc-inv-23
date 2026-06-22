"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/app/components/pagination";
import { usePagination } from "@/app/hooks/use-pagination";
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
  TrendingUp,
  PackageCheck,
  Package,
  CheckCircle2,
  FileSpreadsheet,
  FileDown,
  UserCog,
  MapPin,
  ShieldCheck,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { Item, ItemStatus, StockLog } from "@/app/types";
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
import { User, regenerateOwnerRecoveryCode, formatRecoveryCode } from "@/app/lib/auth";
import { toast } from "sonner";
import { StaffManagement } from "./staff-management";
import { ItemTab } from "./item-tab";

export function OwnerDashboard({
  items,
  statuses,
  logs,
  users,
  onItemsChange,
  onUsersChange,
}: {
  items: Item[];
  statuses: ItemStatus[];
  logs: StockLog[];
  users: User[];
  onItemsChange: () => void;
  onUsersChange: () => void;
}) {
  const [drillDown, setDrillDown] = useState<"habis" | "menipis" | "allGood" | "staff" | "staffManagement" | "recoveryCode" | "items" | null>(null);

  const habisItems = statuses.filter((s) => s.currentStock <= 0 || s.isOverdue);
  const menipisItems = statuses.filter(
    (s) =>
      s.currentStock > 0 &&
      !s.isOverdue &&
      (s.isLow || s.currentStock <= s.item.minStock * 0.5)
  );

  const goodItems = statuses.filter((s) => !s.isLow && !s.isOverdue);

  const hasActions = habisItems.length > 0 || menipisItems.length > 0;

  if (drillDown === "habis") {
    return <HabisDrillDown items={habisItems} onBack={() => setDrillDown(null)} />;
  }
  if (drillDown === "menipis") {
    return <MenipisDrillDown items={menipisItems} onBack={() => setDrillDown(null)} />;
  }
  if (drillDown === "allGood") {
    return <AllGoodDrillDown items={goodItems} onBack={() => setDrillDown(null)} />;
  }
  if (drillDown === "staff") {
    return <StaffDrillDown logs={logs} onBack={() => setDrillDown(null)} />;
  }
  if (drillDown === "staffManagement") {
    return (
      <div className="space-y-4">
        <DrillDownHeader title="Kelola Staff" onBack={() => setDrillDown(null)} />
        <StaffManagement users={users} onUsersChange={onUsersChange} />
      </div>
    );
  }
  if (drillDown === "recoveryCode") {
    return (
      <div className="space-y-4">
        <DrillDownHeader title="Recovery Code Owner" onBack={() => setDrillDown(null)} />
        <RecoveryCodeDrillDown />
      </div>
    );
  }
  if (drillDown === "items") {
    return (
      <div className="space-y-4">
        <DrillDownHeader title="Kelola Item" onBack={() => setDrillDown(null)} />
        <ItemTab items={items} logs={logs} onItemsChange={onItemsChange} />
      </div>
    );
  }
  const alertCount = (habisItems.length > 0 ? 1 : 0) + (menipisItems.length > 0 ? 1 : 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center space-y-1 py-2">
        <p className="text-sm text-muted-foreground">{formatToday()}</p>
        <h2 className="text-2xl font-bold">Ringkasan Stok</h2>
      </div>

      {!hasActions && (
        <ZeroStateCard goodCount={goodItems.length} />
      )}

      <div className={`grid gap-4 ${alertCount === 1 ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        {habisItems.length > 0 && (
          <HabisSection items={habisItems} onDrillDown={() => setDrillDown("habis")} />
        )}

        {menipisItems.length > 0 && (
          <MenipisSection items={menipisItems} onDrillDown={() => setDrillDown("menipis")} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightSection statuses={statuses} logs={logs} />
        <RekapSection statuses={statuses} logs={logs} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ItemsSection onDrillDown={() => setDrillDown("items")} />
        <StaffSection logs={logs} onDrillDown={() => setDrillDown("staff")} />
        <StaffManagementSection onDrillDown={() => setDrillDown("staffManagement")} />
        <RecoveryCodeSection onDrillDown={() => setDrillDown("recoveryCode")} />
      </div>

      <AllGoodSection items={goodItems} onDrillDown={() => setDrillDown("allGood")} />
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

function HabisSection({
  items,
  onDrillDown,
}: {
  items: ItemStatus[];
  onDrillDown: () => void;
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
          <p className="text-sm opacity-80">Item dalam kondisi habis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {visible.map((s) => (
          <div
            key={s.item.id}
            className="rounded-xl border border-red-200 bg-white/60 dark:bg-red-950/30 dark:border-red-900 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold">{s.item.name}</p>
              </div>
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
}: {
  items: ItemStatus[];
  onDrillDown: () => void;
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
          <p className="text-sm opacity-80">Item stoknya mulai menipis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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

  const chartData = useMemo(
    () =>
      data.slice(0, 5).map((d) => ({
        name: d.item.name,
        terpakai: Math.round(d.used),
      })),
    [data]
  );

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-100">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 shrink-0">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          {top ? (
            <>
              <h3 className="text-base font-bold leading-tight">{top.item.name} paling laris</h3>
              <p className="text-sm opacity-80 mt-1">
                {PERIOD_LABELS[period]}: terpakai {Math.round(top.used)} {top.item.unit}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold leading-tight">Belum ada data penggunaan</h3>
              <p className="text-sm opacity-80 mt-1">
                Tidak ada item yang terpakai di periode {PERIOD_LABELS[period].toLowerCase()}.
              </p>
            </>
          )}
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <PeriodTabs value={period} onChange={setPeriod} />
          </div>
          {top && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="mt-3 text-sm font-semibold text-blue-700 dark:text-blue-200 flex items-center gap-1"
            >
              {expanded ? "Sembunyikan" : "Detail Lengkap"} {expanded ? "↑" : "→"}
            </button>
          )}

          {expanded && top && (
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

function ItemsSection({ onDrillDown }: { onDrillDown: () => void }) {
  return (
    <div
      onClick={onDrillDown}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onDrillDown()}
      className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-cyan-900 transition-transform active:scale-[0.98] dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-100"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
          <p className="text-sm font-medium">Kelola Item</p>
        </div>
        <span className="text-xs font-semibold opacity-80">Detail Lengkap →</span>
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
      className="rounded-xl border border-[#c8a27a] bg-[#f5e6d3] p-3 text-[#5d3a1a] transition-transform active:scale-[0.98] dark:border-[#7a5c3c] dark:bg-[#3d2b1f] dark:text-[#eed9b3]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-[#8b5a2b] dark:text-[#d4a574]" />
          <p className="text-sm font-medium">
            {hasCheckToday ? "Pengecekan harian telah dilakukan" : "Pengecekan harian belum tercatat"}
          </p>
        </div>
        <span className="text-xs font-semibold opacity-80">Detail Lengkap →</span>
      </div>
    </div>
  );
}

function StaffManagementSection({ onDrillDown }: { onDrillDown: () => void }) {
  return (
    <div
      onClick={onDrillDown}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onDrillDown()}
      className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-purple-900 transition-transform active:scale-[0.98] dark:border-purple-900 dark:bg-purple-950 dark:text-purple-100"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCog className="h-5 w-5 text-purple-600 dark:text-purple-300" />
          <p className="text-sm font-medium">Kelola Staff</p>
        </div>
        <span className="text-xs font-semibold opacity-80">Detail Lengkap →</span>
      </div>
    </div>
  );
}

function RecoveryCodeSection({ onDrillDown }: { onDrillDown: () => void }) {
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
          <ShieldCheck className="h-5 w-5" />
          <p className="text-sm font-medium">Recovery Code</p>
        </div>
        <span className="text-xs font-semibold opacity-80">Detail Lengkap →</span>
      </div>
    </div>
  );
}

function AllGoodSection({
  items,
  onDrillDown,
}: {
  items: ItemStatus[];
  onDrillDown: () => void;
}) {
  const visible = items.slice(0, 3);

  return (
    <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 text-green-900 dark:bg-green-950/30 dark:border-green-900 dark:text-green-100">
      <div className="flex items-center gap-2 mb-3">
        <PackageCheck className="h-4 w-4" />
        <span className="font-medium text-sm">{items.length} item aman</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {visible.map((s) => (
          <div
            key={s.item.id}
            className="flex items-center justify-between text-sm rounded-lg bg-white/60 dark:bg-green-950/40 p-2"
          >
            <span>{s.item.name}</span>
            <span className="opacity-70">{s.currentStock} {s.item.unit}</span>
          </div>
        ))}
      </div>

      {items.length > 3 && (
        <button
          onClick={onDrillDown}
          className="w-full text-center text-xs font-semibold text-green-700 dark:text-green-200 py-2 mt-2"
        >
          Lihat {items.length - 3} item aman lainnya →
        </button>
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
}: {
  items: ItemStatus[];
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <DrillDownHeader title="Item Habis" onBack={onBack} />
      {items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Tidak ada item habis.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((s) => (
            <Card
              key={s.item.id}
              className="border-red-200 bg-red-50 text-red-950 dark:bg-red-950 dark:border-red-900 dark:text-red-100"
            >
              <CardContent className="p-4">
                <div>
                  <h3 className="font-bold">{s.item.name}</h3>
                  <p className="text-xs opacity-80">{s.item.category}</p>
                  {s.item.location && (
                    <p className="text-xs opacity-80 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {s.item.location}
                    </p>
                  )}
                </div>
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
}: {
  items: ItemStatus[];
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <DrillDownHeader title="Item Menipis" onBack={onBack} />
      {items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Tidak ada item menipis.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((s) => (
            <Card
              key={s.item.id}
              className="border-orange-200 bg-orange-50 text-orange-950 dark:bg-orange-950 dark:border-orange-900 dark:text-orange-100"
            >
              <CardContent className="p-4">
                <div>
                  <h3 className="font-bold">{s.item.name}</h3>
                  <p className="text-xs opacity-80">Sisa {s.currentStock} {s.item.unit}</p>
                  {s.item.location && (
                    <p className="text-xs opacity-80 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {s.item.location}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AllGoodDrillDown({ items, onBack }: { items: ItemStatus[]; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <DrillDownHeader title="Item Aman" onBack={onBack} />
      {items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Tidak ada item aman.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((s) => (
            <Card
              key={s.item.id}
              className="border-green-200 bg-green-50 text-green-950 dark:bg-green-950 dark:border-green-900 dark:text-green-100"
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-bold">{s.item.name}</h3>
                  <p className="text-xs opacity-80">{s.item.category}</p>
                  {s.item.location && (
                    <p className="text-xs opacity-80 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {s.item.location}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold shrink-0">{s.currentStock} {s.item.unit}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type DateFilter = "all" | "today" | "7days" | "30days";

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  all: "Semua",
  today: "Hari Ini",
  "7days": "7 Hari",
  "30days": "30 Hari",
};

function isWithinDays(dateStr: string, days: number, reference: string) {
  const d = new Date(dateStr + "T00:00:00");
  const ref = new Date(reference + "T00:00:00");
  const diffTime = ref.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

function StaffDrillDown({ logs, onBack }: { logs: StockLog[]; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const today = todayStr();

  const itemMap = useMemo(() => {
    const map = new Map<string, string>();
    getItems().forEach((item) => map.set(item.id, item.name));
    return map;
  }, []);

  const recentActivities = useMemo(
    () => [...logs].sort((a, b) => b.createdAt - a.createdAt),
    [logs]
  );

  const filtered = recentActivities.filter((l) => {
    const matchesSearch = !search.trim()
      ? true
      : (() => {
          const name = (itemMap.get(l.itemId) || "").toLowerCase();
          return (
            name.includes(search.toLowerCase()) ||
            (l.recordedBy || "").toLowerCase().includes(search.toLowerCase())
          );
        })();

    if (!matchesSearch) return false;

    switch (dateFilter) {
      case "today":
        return l.date === today;
      case "7days":
        return isWithinDays(l.date, 7, today);
      case "30days":
        return isWithinDays(l.date, 30, today);
      case "all":
      default:
        return true;
    }
  });

  const {
    currentPage,
    setCurrentPage,
    totalItems,
    totalPages,
    paginatedData,
    startIndex,
    endIndex,
  } = usePagination(filtered, { pageSize: 10 });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFilter, setCurrentPage]);

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

      <div className="flex flex-wrap gap-2">
        {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).map((key) => (
          <Button
            key={key}
            variant={dateFilter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter(key)}
          >
            {DATE_FILTER_LABELS[key]}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {paginatedData.map((log) => (
          <Card key={log.id} className={log.date === today ? "border-primary" : ""}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{itemMap.get(log.itemId) || log.itemId}</h3>
                <p className="text-xs text-muted-foreground">
                  {log.recordedBy || "Staff"} · {formatDate(log.date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LogTypeBadge log={log} />
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

function RecoveryCodeDrillDown() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      const result = await regenerateOwnerRecoveryCode(password);
      if (result) {
        setNewCode(result.code);
        toast.success("Recovery code baru berhasil dibuat. Simpan dengan aman!");
      } else {
        toast.error("Password salah. Recovery code tidak dapat dibuat.");
      }
    } catch {
      toast.error("Gagal membuat recovery code baru.");
    } finally {
      setLoading(false);
      setPassword("");
    }
  };

  const copyCode = async () => {
    if (!newCode) return;
    try {
      await navigator.clipboard.writeText(newCode);
      setCopied(true);
      toast.success("Recovery code disalin.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin.");
    }
  };

  return (
    <div className="space-y-4 max-w-md">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300 shrink-0">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold">Recovery Code Owner</h3>
              <p className="text-sm text-muted-foreground">
                Code ini digunakan untuk reset password owner jika lupa. Kami tidak menyimpannya dalam bentuk asli,
                hanya hash-nya. Jika kamu lupa code lama, buat code baru di sini.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!newCode ? (
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recovery-password">Password Owner Saat Ini</Label>
            <div className="relative">
              <Input
                id="recovery-password"
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={!password || loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
            Buat Recovery Code Baru
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-100">
            <p className="text-sm font-medium mb-2">Recovery code baru (hanya ditampilkan sekali):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white/70 dark:bg-black/30 px-3 py-2 text-sm font-mono tracking-wide">
                {formatRecoveryCode(newCode)}
              </code>
              <Button type="button" size="icon" variant="outline" onClick={copyCode}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setNewCode(null)}>
            Buat Code Lain
          </Button>
        </div>
      )}
    </div>
  );
}

function LogTypeBadge({ log }: { log: StockLog }) {
  switch (log.type) {
    case "in":
      return (
        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-900">
          +{log.qty} Masuk
        </Badge>
      );
    case "add":
      return (
        <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-100 dark:border-violet-900">
          Tambah
        </Badge>
      );
    case "archive":
      return (
        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-900">
          Hapus
        </Badge>
      );
    case "check":
    default:
      return (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-900">
          {log.qty} Cek
        </Badge>
      );
  }
}

export const OwnerTab = OwnerDashboard;
