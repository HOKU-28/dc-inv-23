import { toast } from "sonner";

const SHOPPING_KEY = "dominico-shopping-ids";

export function getShoppingIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SHOPPING_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToShoppingById(itemId: string, itemName: string) {
  const existing = getShoppingIds();
  if (!existing.includes(itemId)) {
    existing.push(itemId);
    localStorage.setItem(SHOPPING_KEY, JSON.stringify(existing));
    toast.success(`${itemName} ditambahkan ke daftar belanja.`);
  }
}

export function removeFromShoppingById(itemId: string) {
  const existing = getShoppingIds();
  localStorage.setItem(SHOPPING_KEY, JSON.stringify(existing.filter((id) => id !== itemId)));
}

export function clearShoppingList() {
  localStorage.removeItem(SHOPPING_KEY);
}
