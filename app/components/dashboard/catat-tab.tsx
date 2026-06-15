"use client";

import { useState } from "react";
import { useForm, Controller, useWatch, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Plus, ClipboardList, Loader2 } from "lucide-react";
import { Item } from "@/app/types";
import { addItem, addLog, frequencyLabel, todayStr } from "@/app/lib/data";
import { getSession } from "@/app/lib/auth";
import { toast } from "sonner";
import { RefreshFn } from "./types";

const NEW_ITEM_VALUE = "__new__";

const catatSchema = z
  .object({
    itemId: z.string().min(1, "Pilih item terlebih dahulu."),
    type: z.enum(["in", "check"]),
    qty: z.coerce.number().min(0, "Jumlah wajib diisi dan tidak boleh negatif."),
    date: z.string().min(1, "Tanggal wajib diisi."),
    note: z.string().optional(),
    newName: z.string().optional(),
    newUnit: z.string().optional(),
    newCategory: z.string().optional(),
    newMinStock: z.coerce.number().optional(),
    newCheckFrequencyDays: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.itemId === NEW_ITEM_VALUE) {
      if (!data.newName?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["newName"], message: "Nama item wajib diisi." });
      }
      if (!data.newUnit?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["newUnit"], message: "Satuan item wajib diisi." });
      }
      if (!data.newCategory?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["newCategory"], message: "Kategori item wajib diisi." });
      }
      if (data.newMinStock === undefined || data.newMinStock < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["newMinStock"], message: "Stok minimal tidak boleh negatif." });
      }
      if (!data.newCheckFrequencyDays || data.newCheckFrequencyDays < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["newCheckFrequencyDays"], message: "Periode pengecekan minimal 1 hari." });
      }
    }
  });

type CatatFormValues = z.infer<typeof catatSchema>;

export function CatatTab({ items, onSaved }: { items: Item[]; onSaved: RefreshFn }) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<CatatFormValues>({
    resolver: zodResolver(catatSchema) as Resolver<CatatFormValues>,
    defaultValues: {
      itemId: "",
      type: "check",
      qty: 0,
      date: todayStr(),
      note: "",
      newName: "",
      newUnit: "pcs",
      newCategory: "Bahan",
      newMinStock: 0,
      newCheckFrequencyDays: 1,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const itemId = useWatch({ control, name: "itemId" });
  const type = useWatch({ control, name: "type" });
  const selectedItem = items.find((i) => i.id === itemId);
  const isNewItem = itemId === NEW_ITEM_VALUE;

  const onSubmit = async (data: CatatFormValues) => {
    setIsSubmitting(true);
    try {
      let targetItemId = data.itemId;
      if (isNewItem) {
        const created = addItem({
          name: data.newName!.trim(),
          unit: data.newUnit!.trim(),
          category: data.newCategory!.trim() || "Bahan",
          minStock: data.newMinStock ?? 0,
          checkFrequencyDays: data.newCheckFrequencyDays ?? 1,
        });
        targetItemId = created.id;
        toast.success(`Item "${created.name}" berhasil ditambahkan dan dicatat.`);
      } else {
        toast.success("Catatan stok berhasil disimpan.");
      }

      addLog({
        itemId: targetItemId,
        type: data.type,
        qty: data.qty,
        date: data.date,
        note: data.note || undefined,
        recordedBy: getSession()?.name,
      });

      reset();
      onSaved();
    } catch {
      toast.error("Gagal menyimpan catatan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Catat Stok</CardTitle>
        <CardDescription>Input stok masuk, cek sisa, atau tambah item baru</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item">Pilih Item</Label>
            <Controller
              name="itemId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="item" aria-invalid={!!errors.itemId}>
                    <SelectValue placeholder="Pilih item stok" />
                  </SelectTrigger>
                  <SelectContent>
                    {items
                      .filter((item) => item.isActive !== false)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <span className="flex items-center gap-2">
                            <span>{item.name}</span>
                            <span className="text-xs text-muted-foreground">({item.unit})</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              {frequencyLabel(item)}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    <SelectItem value={NEW_ITEM_VALUE}>+ Item baru...</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.itemId && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.itemId.message}
              </p>
            )}
          </div>

          {isNewItem && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <p className="text-sm font-medium">Detail item baru</p>
              <div className="space-y-2">
                <Label htmlFor="new-name">Nama Item</Label>
                <Input
                  id="new-name"
                  placeholder="Contoh: Strawberry Jam"
                  aria-invalid={!!errors.newName}
                  className={errors.newName ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("newName")}
                />
                {errors.newName && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.newName.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="new-unit">Satuan</Label>
                  <Input
                    id="new-unit"
                    placeholder="pcs / kg / ml"
                    aria-invalid={!!errors.newUnit}
                    className={errors.newUnit ? "border-destructive focus-visible:ring-destructive" : ""}
                    {...register("newUnit")}
                  />
                  {errors.newUnit && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.newUnit.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-category">Kategori</Label>
                  <Input
                    id="new-category"
                    placeholder="Bahan / Kemasan"
                    aria-invalid={!!errors.newCategory}
                    className={errors.newCategory ? "border-destructive focus-visible:ring-destructive" : ""}
                    {...register("newCategory")}
                  />
                  {errors.newCategory && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.newCategory.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="new-min">Stok Minimal</Label>
                  <Input
                    id="new-min"
                    type="number"
                    min={0}
                    placeholder="0"
                    aria-invalid={!!errors.newMinStock}
                    className={errors.newMinStock ? "border-destructive focus-visible:ring-destructive" : ""}
                    {...register("newMinStock")}
                  />
                  {errors.newMinStock && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.newMinStock.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Periode Pengecekan</Label>
                  <Controller
                    name="newCheckFrequencyDays"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={field.value === 1 ? "default" : "outline"}
                          onClick={() => field.onChange(1)}
                          className="w-full text-xs"
                        >
                          Harian
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === 7 ? "default" : "outline"}
                          onClick={() => field.onChange(7)}
                          className="w-full text-xs"
                        >
                          Mingguan
                        </Button>
                      </div>
                    )}
                  />
                  {errors.newCheckFrequencyDays && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.newCheckFrequencyDays.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Jenis Catatan</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={type === "in" ? "default" : "outline"}
                onClick={() => setValue("type", "in")}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Stok Masuk
              </Button>
              <Button
                type="button"
                variant={type === "check" ? "default" : "outline"}
                onClick={() => setValue("type", "check")}
                className="w-full"
              >
                <ClipboardList className="h-4 w-4 mr-1" />
                Cek Sisa
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qty">
              {type === "in" ? "Jumlah Masuk" : "Sisa Stok"}{" "}
              {selectedItem ? `(${selectedItem.unit})` : isNewItem ? `(unit)` : ""}
            </Label>
            <Input
              id="qty"
              type="number"
              min={0}
              placeholder={type === "in" ? "Contoh: 200" : "Contoh: 170"}
              aria-invalid={!!errors.qty}
              className={errors.qty ? "border-destructive focus-visible:ring-destructive" : ""}
              {...register("qty")}
            />
            {errors.qty && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.qty.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Tanggal</Label>
            <Input
              id="date"
              type="date"
              aria-invalid={!!errors.date}
              className={errors.date ? "border-destructive focus-visible:ring-destructive" : ""}
              {...register("date")}
            />
            {errors.date && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.date.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Catatan (opsional)</Label>
            <Input id="note" placeholder="Contoh: Restock dari supplier" {...register("note")} />
          </div>

          <Button type="submit" className="w-full min-h-11" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Catatan"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
