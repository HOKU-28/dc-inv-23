"use client";

import { useEffect, useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Archive, ArchiveRestore, Trash2, FileDown, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react";
import { Item, StockLog } from "@/app/types";
import { addItem, archiveItem, deleteItem, formatDate, getItemStatus, restoreItem } from "@/app/lib/data";
import { toast } from "sonner";
import { EmptyState } from "@/app/components/empty-state";
import { ConfirmDialog } from "@/app/components/confirm-dialog";
import { Pagination } from "@/app/components/pagination";
import { usePagination } from "@/app/hooks/use-pagination";
import { useDebounce } from "@/app/hooks/use-debounce";
import { exportItemsToExcel, exportItemsToPDF } from "@/app/lib/export";
import { RefreshFn } from "./types";

const itemSchema = z.object({
  name: z.string().min(1, "Nama item wajib diisi."),
  unit: z.string().min(1, "Satuan item wajib diisi."),
  category: z.string().min(1, "Kategori item wajib diisi."),
  minStock: z.coerce.number().min(0, "Stok minimal tidak boleh negatif."),
  checkFrequencyDays: z.coerce.number().min(1, "Periode pengecekan minimal 1 hari."),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export function ItemTab({
  items,
  logs,
  onItemsChange,
}: {
  items: Item[];
  logs: StockLog[];
  onItemsChange: RefreshFn;
}) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    itemId: string | null;
    itemName: string;
    action: "archive" | "restore";
  }>({ open: false, itemId: null, itemName: "", action: "archive" });
  const [isArchiving, setIsArchiving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    itemId: string | null;
    itemName: string;
  }>({ open: false, itemId: null, itemName: "" });
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema) as Resolver<ItemFormValues>,
    defaultValues: {
      name: "",
      unit: "pcs",
      category: "Bahan",
      minStock: 0,
      checkFrequencyDays: 1,
    },
  });

  const debouncedSearch = useDebounce(search, 300);
  const filtered = items
    .filter((i) => (filter === "active" ? i.isActive !== false : i.isActive === false))
    .filter((i) => i.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const {
    currentPage,
    setCurrentPage,
    totalItems,
    totalPages,
    paginatedData: visibleItems,
    startIndex,
    endIndex,
  } = usePagination(filtered, { pageSize: 5 });

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, debouncedSearch, setCurrentPage]);

  const handleAdd = async (values: ItemFormValues) => {
    setIsSubmitting(true);
    try {
      const created = addItem({
        name: values.name.trim(),
        unit: values.unit.trim(),
        category: values.category.trim(),
        minStock: values.minStock,
        checkFrequencyDays: values.checkFrequencyDays,
      });
      reset();
      setShowAdd(false);
      onItemsChange();
      toast.success(`Item "${created.name}" berhasil ditambahkan.`);
    } catch {
      toast.error("Gagal menambahkan item. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openArchiveDialog = (item: Item) => {
    setConfirmDialog({
      open: true,
      itemId: item.id,
      itemName: item.name,
      action: "archive",
    });
  };

  const openRestoreDialog = (item: Item) => {
    setConfirmDialog({
      open: true,
      itemId: item.id,
      itemName: item.name,
      action: "restore",
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.itemId) return;
    setIsArchiving(true);
    try {
      if (confirmDialog.action === "archive") {
        archiveItem(confirmDialog.itemId);
        toast.success(`Item "${confirmDialog.itemName}" telah diarsipkan.`);
      } else {
        restoreItem(confirmDialog.itemId);
        toast.success(`Item "${confirmDialog.itemName}" telah diaktifkan kembali.`);
      }
      onItemsChange();
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    } catch {
      toast.error("Gagal memperbarui status item.");
    } finally {
      setIsArchiving(false);
    }
  };

  const openDeleteDialog = (item: Item) => {
    setDeleteDialog({ open: true, itemId: item.id, itemName: item.name });
  };

  const handleDeletePermanent = async () => {
    if (!deleteDialog.itemId) return;
    setIsDeleting(true);
    try {
      const ok = await deleteItem(deleteDialog.itemId);
      if (ok) {
        toast.success(`Item "${deleteDialog.itemName}" telah dihapus permanen.`);
        onItemsChange();
      } else {
        toast.error("Item tidak ditemukan.");
      }
    } catch {
      toast.error("Gagal menghapus item.");
    } finally {
      setIsDeleting(false);
      setDeleteDialog((prev) => ({ ...prev, open: false }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button size="icon" variant="outline" onClick={() => setShowAdd(true)} aria-label="Tambah item">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("active")}
          className="flex-1"
        >
          Aktif ({items.filter((i) => i.isActive !== false).length})
        </Button>
        <Button
          variant={filter === "archived" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("archived")}
          className="flex-1"
        >
          Arsip ({items.filter((i) => i.isActive === false).length})
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => exportItemsToPDF(filtered, logs)}
          disabled={filtered.length === 0}
        >
          <FileDown className="h-4 w-4" />
          Export PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => exportItemsToExcel(filtered, logs)}
          disabled={filtered.length === 0}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tambah Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleAdd)} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Item</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Cup Kopi"
                  aria-invalid={!!errors.name}
                  className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="unit">Satuan</Label>
                  <Input
                    id="unit"
                    placeholder="pcs"
                    aria-invalid={!!errors.unit}
                    className={errors.unit ? "border-destructive focus-visible:ring-destructive" : ""}
                    {...register("unit")}
                  />
                  {errors.unit && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.unit.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Input
                    id="category"
                    placeholder="Bahan"
                    aria-invalid={!!errors.category}
                    className={errors.category ? "border-destructive focus-visible:ring-destructive" : ""}
                    {...register("category")}
                  />
                  {errors.category && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.category.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="minStock">Stok Minimal</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min={0}
                    placeholder="0"
                    aria-invalid={!!errors.minStock}
                    className={errors.minStock ? "border-destructive focus-visible:ring-destructive" : ""}
                    {...register("minStock")}
                  />
                  {errors.minStock && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.minStock.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freq">Cek Tiap (hari)</Label>
                  <Input
                    id="freq"
                    type="number"
                    min={1}
                    placeholder="1"
                    aria-invalid={!!errors.checkFrequencyDays}
                    className={errors.checkFrequencyDays ? "border-destructive focus-visible:ring-destructive" : ""}
                    {...register("checkFrequencyDays")}
                  />
                  {errors.checkFrequencyDays && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.checkFrequencyDays.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAdd(false)} disabled={isSubmitting}>
                  Batal
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {visibleItems.length === 0 ? (
          <EmptyState
            icon={filter === "active" ? Search : Archive}
            title={filter === "active" ? "Tidak ada item aktif." : "Tidak ada item di arsip."}
            description={
              filter === "active"
                ? "Tambahkan item baru atau ubah filter pencarian."
                : "Item yang diarsipkan akan muncul di sini."
            }
          />
        ) : (
          visibleItems.map((item) => {
            const status = getItemStatus(item, logs);
            const isArchived = item.isActive === false;
            const lastArchiveLog = isArchived
              ? [...logs]
                  .filter((l) => l.itemId === item.id && l.type === "archive")
                  .sort((a, b) => b.createdAt - a.createdAt)[0]
              : undefined;
            return (
              <Card
                key={item.id}
                className={`${status.isLow ? "border-red-200" : ""} ${isArchived ? "opacity-75 bg-muted/30" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-medium ${isArchived ? "line-through text-muted-foreground" : ""}`}>
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.category} · satuan {item.unit}
                      </p>
                      {lastArchiveLog?.recordedBy && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Dihapus oleh {lastArchiveLog.recordedBy}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold leading-none">
                        {status.currentStock}{" "}
                        <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                      </p>
                      {status.isLow && !isArchived && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          Menipis
                        </Badge>
                      )}
                      {isArchived && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Diarsipkan
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      <span>Min stok: {item.minStock}</span>
                      <span className="mx-2">·</span>
                      <span>
                        Cek tiap {item.checkFrequencyDays} hari
                        {status.lastCheckDate && ` · terakhir ${formatDate(status.lastCheckDate)}`}
                      </span>
                    </div>
                    {isArchived ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRestoreDialog(item)}
                          className="gap-1.5"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                          Aktifkan
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteDialog(item)}
                          className="gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openArchiveDialog(item)}
                        className="gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Arsipkan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
        />
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.action === "archive" ? "Arsipkan Item?" : "Aktifkan Kembali Item?"}
        description={
          confirmDialog.action === "archive"
            ? `Item "${confirmDialog.itemName}" akan dipindahkan ke arsip dan tidak muncul di daftar aktif.`
            : `Item "${confirmDialog.itemName}" akan diaktifkan kembali dan muncul di daftar aktif.`
        }
        onConfirm={handleConfirmAction}
        confirmLabel={confirmDialog.action === "archive" ? "Arsipkan" : "Aktifkan"}
        cancelLabel="Batal"
        variant={confirmDialog.action === "archive" ? "destructive" : "default"}
        isLoading={isArchiving}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        title="Hapus Item Permanen?"
        description={`Item "${deleteDialog.itemName}" akan dihapus sepenuhnya dan tidak bisa dikembalikan lagi. Tindakan ini tidak mempengaruhi log aktivitas yang sudah tercatat.`}
        onConfirm={handleDeletePermanent}
        confirmLabel="Hapus Permanen"
        cancelLabel="Batal"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
