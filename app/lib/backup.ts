export const BACKUP_KEYS = [
  "dominico-items",
  "dominico-logs",
  "dominico-sales",
  "dominico-session",
  "dominico-theme",
];

export interface BackupData {
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

export function createBackup(): BackupData {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function downloadBackup() {
  const backup = createBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dominico-backup-${backup.exportedAt.split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateBackup(data: unknown): data is BackupData {
  if (typeof data !== "object" || data === null) return false;
  const backup = data as Partial<BackupData>;
  if (backup.version !== 1) return false;
  if (typeof backup.exportedAt !== "string") return false;
  if (typeof backup.data !== "object" || backup.data === null) return false;
  return true;
}

export function restoreBackup(backup: BackupData): string[] {
  const restoredKeys: string[] = [];
  for (const key of BACKUP_KEYS) {
    if (key in backup.data) {
      localStorage.setItem(key, JSON.stringify(backup.data[key]));
      restoredKeys.push(key);
    }
  }
  return restoredKeys;
}

export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!validateBackup(parsed)) {
          reject(new Error("File backup tidak valid."));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error("Gagal membaca file backup."));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsText(file);
  });
}
