"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, LogOut, Printer, QrCode, Sun, Moon } from "lucide-react";
import { getItems, getActiveItems } from "@/app/lib/data";
import { Item } from "@/app/types";
import { logout, requireAuth } from "@/app/lib/auth";
import { useTheme } from "@/app/components/theme-provider";
import { DashboardSkeleton } from "@/app/components/skeletons";
import { toast } from "sonner";
import QRCode from "qrcode";

export default function LabelsPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const session = requireAuth("owner");
    if (!session) {
      router.replace("/");
      return;
    }
    setMounted(true);
    const active = getActiveItems();
    setItems(active);
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
    );
  }, [items, search]);

  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        Array.from(selected).map(async (id) => {
          const item = items.find((i) => i.id === id);
          if (!item) return;
          try {
            const dataUrl = await QRCode.toDataURL(item.barcode || item.id, {
              width: 160,
              margin: 1,
              color: { dark: "#000000", light: "#ffffff" },
            });
            next[id] = dataUrl;
          } catch {
            // ignore
          }
        })
      );
      if (!cancelled) setQrMap(next);
    };
    generate();
    return () => {
      cancelled = true;
    };
  }, [selected, items]);

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((i) => i.id)));
    }
  };

  const handlePrint = () => {
    if (selected.size === 0) {
      toast.info("Pilih item dulu untuk dicetak labelnya.");
      return;
    }
    window.print();
  };

  const handleLogout = () => {
    logout();
    toast.info("Anda telah keluar.");
    router.replace("/");
  };

  if (!mounted) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur print:hidden">
        <div className="mx-auto w-full max-w-md px-4 py-3 sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/owner")} aria-label="Kembali">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold leading-tight">Cetak Label QR</h1>
              <p className="text-xs text-muted-foreground">Pilih item, lalu cetak</p>
            </div>
          </div>
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
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-10 w-10 text-muted-foreground" aria-label="Keluar">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-4 sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl print:p-0 print:max-w-none">
        <div className="space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Cari item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 flex-1"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={toggleAll} className="h-12 flex-1 sm:flex-none">
                {selected.size === filtered.length && filtered.length > 0 ? "Batal Pilih" : "Pilih Semua"}
              </Button>
              <Button onClick={handlePrint} className="h-12 flex-1 sm:flex-none">
                <Printer className="h-4 w-4 mr-2" />
                Cetak {selected.size > 0 && `(${selected.size})`}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((item) => (
              <label
                key={item.id}
                htmlFor={`label-${item.id}`}
                className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${
                  selected.has(item.id) ? "bg-primary/5 border-primary" : "bg-card hover:bg-muted/50"
                }`}
              >
                <input
                  id={`label-${item.id}`}
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                  className="h-5 w-5 rounded border-input accent-foreground mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.barcode || item.id}</p>
                </div>
              </label>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">Tidak ada item.</p>
          )}
        </div>

        <div className="hidden print:block">
          <div className="grid grid-cols-3 gap-4">
            {Array.from(selected).map((id) => {
              const item = items.find((i) => i.id === id);
              if (!item) return null;
              return (
                <div
                  key={id}
                  className="flex flex-col items-center justify-center border border-gray-300 rounded-xl p-4 text-center break-inside-avoid"
                >
                  {qrMap[id] ? (
                    <img src={qrMap[id]} alt="QR" className="w-28 h-28" />
                  ) : (
                    <div className="w-28 h-28 flex items-center justify-center bg-gray-100">
                      <QrCode className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                  <p className="mt-2 font-bold text-sm leading-tight">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.barcode || item.id}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          body {
            background: white;
          }
          header, nav, .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
