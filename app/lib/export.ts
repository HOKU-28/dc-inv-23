import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Item, StockLog, MonthlyUsage } from "@/app/types";
import { getItemStatus } from "@/app/lib/data";

// ---------- Rekap exports ----------

export function exportRekapToPDF(reports: MonthlyUsage[], periodLabel: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFontSize(16);
  doc.text("Rekap Stok Dominico", 14, 20);
  doc.setFontSize(11);
  doc.text(`Periode: ${periodLabel}`, 14, 28);

  autoTable(doc, {
    startY: 35,
    head: [["Item", "Awal", "Masuk", "Sisa", "Terpakai"]],
    body: reports.map((r) => [
      `${r.itemName} (${r.unit})`,
      String(r.opening),
      `+${r.totalIn}`,
      String(r.closing),
      String(r.used),
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [33, 33, 33] },
  });

  doc.save(`rekap-stok-${periodLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export function exportRekapToExcel(reports: MonthlyUsage[], periodLabel: string) {
  const data = reports.map((r) => ({
    Item: r.itemName,
    Satuan: r.unit,
    Awal: r.opening,
    Masuk: r.totalIn,
    Sisa: r.closing,
    Terpakai: r.used,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Stok");
  XLSX.writeFile(wb, `rekap-stok-${periodLabel.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
}

// ---------- Item exports ----------

export function exportItemsToPDF(items: Item[], logs: StockLog[]) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFontSize(16);
  doc.text("Daftar Item Dominico", 14, 20);
  doc.setFontSize(11);
  doc.text(`Total: ${items.length} item`, 14, 28);

  autoTable(doc, {
    startY: 35,
    head: [["Nama Item", "Kategori", "Satuan", "Stok Saat Ini", "Min Stok", "Periode Cek"]],
    body: items.map((item) => {
      const status = getItemStatus(item, logs);
      return [
        item.name,
        item.category,
        item.unit,
        `${status.currentStock}`,
        `${item.minStock}`,
        item.checkFrequencyDays <= 1 ? "Harian" : item.checkFrequencyDays >= 7 ? "Mingguan" : `${item.checkFrequencyDays} hari`,
      ];
    }),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [33, 33, 33] },
  });

  doc.save(`daftar-item-dominico.pdf`);
}

export function exportItemsToExcel(items: Item[], logs: StockLog[]) {
  const data = items.map((item) => {
    const status = getItemStatus(item, logs);
    return {
      "Nama Item": item.name,
      Kategori: item.category,
      Satuan: item.unit,
      "Stok Saat Ini": status.currentStock,
      "Stok Minimal": item.minStock,
      "Periode Cek": item.checkFrequencyDays <= 1
        ? "Harian"
        : item.checkFrequencyDays >= 7
          ? "Mingguan"
          : `${item.checkFrequencyDays} hari`,
      Status: item.isActive === false ? "Diarsipkan" : "Aktif",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Daftar Item");
  XLSX.writeFile(wb, "daftar-item-dominico.xlsx");
}

// ---------- History export ----------

export function exportHistoryToPDF(logs: StockLog[], itemNameById: Map<string, string>) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFontSize(16);
  doc.text("Riwayat Pencatatan Dominico", 14, 20);
  doc.setFontSize(11);
  doc.text(`Total: ${logs.length} catatan`, 14, 28);

  autoTable(doc, {
    startY: 35,
    head: [["Tanggal", "Item", "Jenis", "Jumlah", "Catatan", "Staff"]],
    body: logs.map((log) => [
      log.date,
      itemNameById.get(log.itemId) ?? log.itemId,
      log.type === "in" ? "Stok Masuk" : "Cek Sisa",
      String(log.qty),
      log.note ?? "-",
      log.recordedBy ?? "-",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [33, 33, 33] },
  });

  doc.save("riwayat-pencatatan-dominico.pdf");
}

export function exportHistoryToExcel(logs: StockLog[], itemNameById: Map<string, string>) {
  const data = logs.map((log) => ({
    Tanggal: log.date,
    Item: itemNameById.get(log.itemId) ?? log.itemId,
    Jenis: log.type === "in" ? "Stok Masuk" : "Cek Sisa",
    Jumlah: log.qty,
    Catatan: log.note ?? "",
    Staff: log.recordedBy ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Riwayat");
  XLSX.writeFile(wb, "riwayat-pencatatan-dominico.xlsx");
}
