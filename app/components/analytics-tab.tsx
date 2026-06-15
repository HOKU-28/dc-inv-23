"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/app/components/empty-state";
import { TrendingDown, Package, AlertCircle, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { Item, StockLog } from "@/app/types";
import { getItemStatus } from "@/app/lib/data";
import {
  getLowStockItems,
  getReorderRecommendations,
  getStockMovementData,
  getTopUsedItems,
  MovementPeriod,
} from "@/app/lib/analytics";

const PERIOD_LABELS: Record<MovementPeriod, string> = {
  daily: "Harian (7 hari terakhir)",
  weekly: "Mingguan (7 minggu terakhir)",
  monthly: "Bulanan (7 bulan terakhir)",
  yearly: "Tahunan (7 tahun terakhir)",
};

const PERIOD_BUTTONS: { value: MovementPeriod; label: string }[] = [
  { value: "daily", label: "Harian" },
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
  { value: "yearly", label: "Tahunan" },
];

function UrgencyBadge({ urgency }: { urgency: "safe" | "soon" | "urgent" }) {
  if (urgency === "urgent") {
    return <Badge variant="destructive">Segera</Badge>;
  }
  if (urgency === "soon") {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        Dalam waktu dekat
      </Badge>
    );
  }
  return <Badge variant="outline">Aman</Badge>;
}

function ChartSkeleton() {
  return <Skeleton className="h-[280px] w-full rounded-lg" />;
}

export function AnalyticsTab({ items, logs }: { items: Item[]; logs: StockLog[] }) {
  const [period, setPeriod] = useState<MovementPeriod>("daily");
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [showAllLow, setShowAllLow] = useState(false);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  const statuses = useMemo(() => items.map((item) => getItemStatus(item, logs)), [items, logs]);
  const movementData = useMemo(() => getStockMovementData(items, logs, period), [items, logs, period]);
  const topItems = useMemo(() => getTopUsedItems(items, logs, 30, 5), [items, logs]);
  const lowStockItems = useMemo(() => getLowStockItems(statuses), [statuses]);
  const recommendations = useMemo(() => getReorderRecommendations(items, logs, statuses), [items, logs, statuses]);

  const visibleLowStock = showAllLow ? lowStockItems : lowStockItems.slice(0, 3);
  const visibleRecommendations = showAllRecommendations ? recommendations : recommendations.slice(0, 3);

  const hasMovement = movementData.some((d) => d.in > 0 || d.used > 0);

  // Simulate brief loading state when switching period for better UX
  const handlePeriodChange = (newPeriod: MovementPeriod) => {
    if (newPeriod === period) return;
    setIsChartLoading(true);
    setPeriod(newPeriod);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsChartLoading(false), 250);
    return () => clearTimeout(timer);
  }, [movementData]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Pergerakan Stok
          </CardTitle>
          <CardDescription>{PERIOD_LABELS[period]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Pilih periode">
            {PERIOD_BUTTONS.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? "default" : "outline"}
                size="sm"
                onClick={() => handlePeriodChange(p.value)}
                role="tab"
                aria-selected={period === p.value}
                aria-label={p.label}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {isChartLoading ? (
            <ChartSkeleton />
          ) : hasMovement ? (
            <div className="h-[280px] w-full sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={movementData}
                  margin={{ top: 8, right: 8, bottom: 8, left: -12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={period === "daily" ? 0 : -35}
                    textAnchor={period === "daily" ? "middle" : "end"}
                    height={period === "daily" ? 28 : 60}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => [value ?? 0, name === "in" ? "Stok Masuk" : "Terpakai"]}
                    labelStyle={{ fontSize: 12 }}
                    contentStyle={{ borderRadius: 8 }}
                  />
                  <Legend formatter={(value) => (value === "in" ? "Stok Masuk" : "Terpakai")} />
                  <Bar
                    dataKey="in"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive
                    animationDuration={500}
                  />
                  <Bar
                    dataKey="used"
                    fill="var(--chart-3)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive
                    animationDuration={500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="Belum ada data pergerakan"
              description="Data stok masuk dan pemakaian akan muncul di sini setelah ada pencatatan."
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Item Paling Banyak Terpakai
            </CardTitle>
            <CardDescription>30 hari terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Belum ada data"
                description="Belum ada item yang tercatat terpakai dalam 30 hari terakhir."
              />
            ) : (
              <div className="space-y-3">
                {topItems.map((item, index) => (
                  <div key={item.itemId} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.used} {item.unit} terpakai
                      </p>
                    </div>
                    {index === 0 && <Badge variant="default">Top</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Stok Menipis
            </CardTitle>
            <CardDescription>Item di bawah stok minimal</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <EmptyState
                icon={TrendingDown}
                title="Tidak ada stok menipis"
                description="Semua item di atas stok minimal."
              />
            ) : (
              <div className="space-y-3">
                {visibleLowStock.map((item) => (
                  <div
                    key={item.item.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Sisa {item.currentStock} {item.item.unit} · Min {item.minStock} {item.item.unit}
                      </p>
                    </div>
                    <Badge variant="destructive">-{item.gap}</Badge>
                  </div>
                ))}
                {lowStockItems.length > 3 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAllLow((v) => !v)}
                    aria-expanded={showAllLow}
                  >
                    {showAllLow ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1.5" />
                        Sembunyikan
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1.5" />
                        Lihat semua ({lowStockItems.length})
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Rekomendasi Restock
          </CardTitle>
          <CardDescription>Berdasarkan rata-rata pemakaian 30 hari terakhir</CardDescription>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="Tidak perlu restock"
              description="Semua item masih aman untuk sementara waktu."
            />
          ) : (
            <div className="space-y-3">
              {visibleRecommendations.map((rec) => (
                <div key={rec.item.id} className="flex flex-col gap-1 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{rec.item.name}</p>
                    <UrgencyBadge urgency={rec.urgency} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sisa {rec.currentStock} {rec.item.unit} · rata-rata {rec.avgDailyUsage.toFixed(1)}{" "}
                    {rec.item.unit}/hari
                    {Number.isFinite(rec.estimatedDaysLeft)
                      ? ` · estimasi ${Math.floor(rec.estimatedDaysLeft)} hari lagi`
                      : " · belum ada data pemakaian"}
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    Saran beli: {Math.ceil(rec.suggestedQty)} {rec.item.unit}
                  </p>
                </div>
              ))}
              {recommendations.length > 3 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAllRecommendations((v) => !v)}
                  aria-expanded={showAllRecommendations}
                >
                  {showAllRecommendations ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1.5" />
                      Sembunyikan
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1.5" />
                      Lihat semua ({recommendations.length})
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
