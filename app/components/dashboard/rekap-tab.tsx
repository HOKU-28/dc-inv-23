"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, FileDown, FileSpreadsheet, Search } from "lucide-react";
import { Item, StockLog } from "@/app/types";
import {
  formatDate,
  formatPeriodRange,
  formatWeekLabel,
  getDailyUsage,
  getISOWeek,
  getISOWeeksInYear,
  getMonthlyUsage,
  getWeekDateRange,
  getWeeklyUsage,
  getYearlyUsage,
  todayStr,
} from "@/app/lib/data";
import { EmptyState } from "@/app/components/empty-state";
import { Pagination } from "@/app/components/pagination";
import { usePagination } from "@/app/hooks/use-pagination";
import { useDebounce } from "@/app/hooks/use-debounce";
import { exportRekapToExcel, exportRekapToPDF } from "@/app/lib/export";
import { MobileRekapList } from "@/app/components/mobile-data-views";

type RecapPeriod = "daily" | "weekly" | "monthly" | "yearly";

export function RekapTab({ items, logs }: { items: Item[]; logs: StockLog[] }) {
  const now = new Date();
  const today = todayStr();
  const currentISOWeek = getISOWeek(today);
  const currentYear = now.getFullYear();

  const [period, setPeriod] = useState<RecapPeriod>("daily");
  const [dailyDate, setDailyDate] = useState<string>(today);
  const [weeklyYear, setWeeklyYear] = useState<number>(currentYear);
  const [weeklyWeek, setWeeklyWeek] = useState<number>(currentISOWeek);
  const [monthlyYear, setMonthlyYear] = useState<number>(currentYear);
  const [monthlyMonth, setMonthlyMonth] = useState<number>(now.getMonth() + 1);
  const [yearlyYear, setYearlyYear] = useState<number>(currentYear);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const debouncedSearch = useDebounce(search, 300);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(),
    [items]
  );

  const allReports = useMemo(() => {
    return items.map((item) => {
      if (period === "daily") {
        return getDailyUsage(item.id, dailyDate, logs);
      }
      if (period === "weekly") {
        return getWeeklyUsage(item.id, weeklyYear, weeklyWeek, logs);
      }
      if (period === "yearly") {
        return getYearlyUsage(item.id, yearlyYear, logs);
      }
      return getMonthlyUsage(item.id, monthlyYear, monthlyMonth, logs);
    });
  }, [items, logs, period, dailyDate, weeklyYear, weeklyWeek, monthlyYear, monthlyMonth, yearlyYear]);

  const reports = allReports.filter((r) => {
    const item = items.find((i) => i.id === r.itemId);
    if (!item) return false;

    const matchesSearch =
      !debouncedSearch.trim() ||
      r.itemName.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const {
    currentPage: rekapPage,
    setCurrentPage: setRekapPage,
    totalItems: rekapTotalItems,
    totalPages: rekapTotalPages,
    paginatedData: visibleReports,
    startIndex: rekapStartIndex,
    endIndex: rekapEndIndex,
  } = usePagination(reports, { pageSize: 5 });

  useEffect(() => {
    setRekapPage(1);
  }, [debouncedSearch, categoryFilter, period, dailyDate, weeklyYear, weeklyWeek, monthlyYear, monthlyMonth, yearlyYear, setRekapPage]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const weeks = Array.from({ length: getISOWeeksInYear(weeklyYear) }, (_, i) => i + 1);

  const periodLabel = () => {
    if (period === "daily") return formatDate(dailyDate);
    if (period === "weekly") {
      const { start, end } = getWeekDateRange(weeklyYear, weeklyWeek);
      return formatPeriodRange(start, end);
    }
    if (period === "yearly") return String(yearlyYear);
    return new Date(monthlyYear, monthlyMonth - 1, 1).toLocaleString("id-ID", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rekap</CardTitle>
          <CardDescription>
            Total stok masuk, sisa, dan terpakai · <span className="font-medium">{periodLabel()}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Periode Rekap</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                type="button"
                variant={period === "daily" ? "default" : "outline"}
                onClick={() => setPeriod("daily")}
                className="w-full text-xs"
              >
                Harian
              </Button>
              <Button
                type="button"
                variant={period === "weekly" ? "default" : "outline"}
                onClick={() => setPeriod("weekly")}
                className="w-full text-xs"
              >
                Mingguan
              </Button>
              <Button
                type="button"
                variant={period === "monthly" ? "default" : "outline"}
                onClick={() => setPeriod("monthly")}
                className="w-full text-xs"
              >
                Bulanan
              </Button>
              <Button
                type="button"
                variant={period === "yearly" ? "default" : "outline"}
                onClick={() => setPeriod("yearly")}
                className="w-full text-xs"
              >
                Tahunan
              </Button>
            </div>
          </div>

          {period === "daily" && (
            <div className="space-y-2">
              <Label htmlFor="daily-date">Tanggal</Label>
              <Input
                id="daily-date"
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
              />
            </div>
          )}

          {period === "weekly" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tahun</Label>
                <Select value={String(weeklyYear)} onValueChange={(v) => v && setWeeklyYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Minggu</Label>
                <Select value={String(weeklyWeek)} onValueChange={(v) => v && setWeeklyWeek(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weeks.map((w) => (
                      <SelectItem key={w} value={String(w)}>
                        {formatWeekLabel(weeklyYear, w)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {period === "monthly" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tahun</Label>
                <Select value={String(monthlyYear)} onValueChange={(v) => v && setMonthlyYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bulan</Label>
                <Select value={String(monthlyMonth)} onValueChange={(v) => v && setMonthlyMonth(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {new Date(2000, m - 1, 1).toLocaleString("id-ID", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {period === "yearly" && (
            <div className="space-y-2">
              <Label>Tahun</Label>
              <Select value={String(yearlyYear)} onValueChange={(v) => v && setYearlyYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v || "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Semua kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kategori</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => exportRekapToPDF(reports, periodLabel())}
              disabled={reports.length === 0}
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => exportRekapToExcel(reports, periodLabel())}
              disabled={reports.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
          </div>

          {reports.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Belum ada item"
              description="Tambahkan item terlebih dahulu atau ubah filter pencarian."
            />
          ) : (
            <>
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Item</TableHead>
                      <TableHead className="text-right">Awal</TableHead>
                      <TableHead className="text-right">Masuk</TableHead>
                      <TableHead className="text-right">Sisa</TableHead>
                      <TableHead className="text-right">Terpakai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleReports.map((r) => (
                      <TableRow key={r.itemId}>
                        <TableCell className="font-medium text-sm">
                          {r.itemName}
                          <span className="block text-xs text-muted-foreground font-normal">{r.unit}</span>
                        </TableCell>
                        <TableCell className="text-right">{r.opening}</TableCell>
                        <TableCell className="text-right text-green-600">+{r.totalIn}</TableCell>
                        <TableCell className="text-right">{r.closing}</TableCell>
                        <TableCell className="text-right font-semibold">{r.used}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <MobileRekapList reports={visibleReports} />
            </>
          )}

          <Pagination
            currentPage={rekapPage}
            totalPages={rekapTotalPages}
            totalItems={rekapTotalItems}
            startIndex={rekapStartIndex}
            endIndex={rekapEndIndex}
            onPageChange={setRekapPage}
          />
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20">
        <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-100">
          <p className="font-medium mb-1">Contoh perhitungan: Cup Kopi</p>
          <p className="text-xs leading-relaxed">
            Awal 0 + masuk 400 (200 + 200) − sisa akhir 150 = <strong>250 cup terpakai</strong>.
            Sistem menghitung otomatis dari log stok masuk dan cek sisa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
