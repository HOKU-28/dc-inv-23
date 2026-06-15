"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, TrendingDown, CalendarClock, Plus } from "lucide-react";
import { formatDate, getItemStatus } from "@/app/lib/data";
import { EmptyState } from "@/app/components/empty-state";

export function BerandaTab({
  todayTasks,
  overdueTasks,
  lowStockItems,
  onCatat,
}: {
  todayTasks: ReturnType<typeof getItemStatus>[];
  overdueTasks: ReturnType<typeof getItemStatus>[];
  lowStockItems: ReturnType<typeof getItemStatus>[];
  onCatat: () => void;
}) {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tugas Hari Ini</CardTitle>
          <CardDescription>Item yang perlu dicek stoknya</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayTasks.length === 0 && overdueTasks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Semua tugas teratasi!"
              description="Tidak ada pengecekan stok yang perlu dikerjakan hari ini."
              variant="success"
            />
          ) : (
            <>
              {overdueTasks.map((s) => (
                <TaskCard key={s.item.id} status={s} variant="overdue" />
              ))}
              {todayTasks
                .filter((s) => !s.isOverdue)
                .map((s) => (
                  <TaskCard key={s.item.id} status={s} variant="today" />
                ))}
            </>
          )}
          <Button onClick={onCatat} className="w-full mt-2">
            <Plus className="h-4 w-4 mr-2" />
            Catat Stok Sekarang
          </Button>
        </CardContent>
      </Card>

      {lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Stok Menipis
            </CardTitle>
            <CardDescription>Perlu restock ke supplier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStockItems.map((s) => (
              <div
                key={s.item.id}
                className="flex items-center justify-between rounded-lg border bg-white p-3 dark:bg-background"
              >
                <div>
                  <p className="font-medium text-sm">{s.item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Sisa {s.currentStock} {s.item.unit} (min {s.item.minStock})
                  </p>
                </div>
                <Badge variant="destructive">Restock</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cara Pakai</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-sm text-muted-foreground list-decimal pl-4 space-y-1">
            <li>Tab <strong>Catat</strong>: staff input stok masuk atau sisa.</li>
            <li>Tab <strong>Item</strong>: lihat semua stok & tambah item baru.</li>
            <li>Tab <strong>Rekap</strong>: hitung total terpakai per bulan.</li>
            <li>Tab <strong>Owner</strong>: pantau tugas yang belum dikerjakan.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

export function TaskCard({
  status,
  variant,
}: {
  status: ReturnType<typeof getItemStatus>;
  variant: "today" | "overdue";
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${variant === "overdue" ? "text-red-500" : "text-amber-500"}`}>
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-sm">{status.item.name}</p>
          <p className="text-xs text-muted-foreground">
            Sisa {status.currentStock} {status.item.unit} · Cek tiap {status.item.checkFrequencyDays} hari
          </p>
          <p className="text-xs mt-1">
            {variant === "overdue" ? (
              <span className="text-red-600 font-medium">Terlewat: {formatDate(status.nextCheckDate!)}</span>
            ) : (
              <span className="text-amber-600 font-medium">Jatuh tempo: {formatDate(status.nextCheckDate!)}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
