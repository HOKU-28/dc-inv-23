export type StockLogType = "in" | "check" | "add" | "archive";

export interface StockLog {
  id: string;
  itemId: string;
  type: StockLogType;
  qty: number;
  date: string; // YYYY-MM-DD
  note?: string;
  recordedBy?: string;
  createdAt: number;
}

export interface Sale {
  id: string;
  itemId: string;
  qty: number;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
}

export interface Item {
  id: string;
  name: string;
  unit: string;
  category: string;
  minStock: number;
  checkFrequencyDays: number;
  isActive: boolean;
  barcode?: string;
  location?: string;
}

export interface MonthlyUsage {
  itemId: string;
  itemName: string;
  unit: string;
  opening: number;
  totalIn: number;
  closing: number;
  used: number;
}

export interface ItemStatus {
  item: Item;
  currentStock: number;
  lastCheckDate?: string;
  nextCheckDate?: string;
  isLow: boolean;
  isOverdue: boolean;
}

export interface ReorderSuggestion {
  item: Item;
  currentStock: number;
  avgDailyUsage: number;
  estimatedDaysLeft: number;
  suggestedOrderDate: string;
  urgency: "safe" | "soon" | "urgent";
}

export interface DailyQueue {
  date: string;
  queue: string[];
  backlog: string[];
}
