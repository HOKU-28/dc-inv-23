import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthlyUsage, StockLog } from "@/app/types";
import { formatDate } from "@/app/lib/data";
import { Trash2, Loader2 } from "lucide-react";

interface MobileRekapListProps {
  reports: MonthlyUsage[];
}

export function MobileRekapList({ reports }: MobileRekapListProps) {
  return (
    <div className="space-y-3 md:hidden">
      {reports.map((r) => (
        <Card key={r.itemId}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-sm">{r.itemName}</p>
                <p className="text-xs text-muted-foreground">{r.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{r.used}</p>
                <p className="text-xs text-muted-foreground">terpakai</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">Awal</p>
                <p className="text-sm font-medium">{r.opening}</p>
              </div>
              <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2">
                <p className="text-xs text-muted-foreground">Masuk</p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">+{r.totalIn}</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">Sisa</p>
                <p className="text-sm font-medium">{r.closing}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface MobileHistoryListProps {
  logs: StockLog[];
  itemNameById: Map<string, string>;
  showItemName?: boolean;
  onDelete?: (id: string) => void;
  deletingId?: string | null;
}

export function MobileHistoryList({ logs, itemNameById, showItemName = true, onDelete, deletingId }: MobileHistoryListProps) {
  return (
    <div className="space-y-3 md:hidden">
      {logs.map((log) => (
        <Card key={log.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">
                  {log.type === "in" ? "Stok Masuk" : "Cek Sisa"}: {log.qty}
                </p>
                {showItemName && (
                  <p className="text-xs font-medium text-primary truncate">
                    {itemNameById.get(log.itemId) ?? log.itemId}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-xs text-muted-foreground">{formatDate(log.date)}</p>
                {onDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground -mr-2"
                    onClick={() => onDelete(log.id)}
                    aria-label="Hapus catatan"
                    disabled={deletingId === log.id}
                  >
                    {deletingId === log.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
            {(log.note || log.recordedBy) && (
              <p className="text-xs text-muted-foreground">
                {log.note ? `${log.note}` : ""}
                {log.note && log.recordedBy ? " · " : ""}
                {log.recordedBy ? `oleh ${log.recordedBy}` : ""}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
