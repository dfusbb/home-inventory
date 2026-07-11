import { guessCategory } from "@/lib/categories";
import { defaultUnitForCategory } from "@/lib/units";

export interface RecoveredProductState {
  name: string;
  quantity: number;
  category: string;
  deleted: boolean;
}

function parseQuantity(value: string): number {
  const num = Number(value);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

export function replayProductLogs(
  logs: Array<{
    action: string;
    details: string | null;
    productName: string | null;
  }>
): Map<string, RecoveredProductState> {
  const products = new Map<string, RecoveredProductState>();

  for (const log of logs) {
    if (!log.productName?.trim()) continue;
    const name = log.productName.trim();
    const current =
      products.get(name) ??
      ({
        name,
        quantity: 0,
        category: guessCategory(name),
        deleted: false,
      } satisfies RecoveredProductState);

    switch (log.action) {
      case "הוספת מוצר": {
        const qtyMatch = log.details?.match(/כמות:\s*([\d.]+)/);
        const categoryMatch = log.details?.match(/קטגוריה:\s*(.+)$/);
        current.quantity = qtyMatch ? parseQuantity(qtyMatch[1]) : current.quantity;
        current.category = categoryMatch?.[1]?.trim() || current.category;
        current.deleted = false;
        break;
      }
      case "מחיקת מוצר":
        current.deleted = true;
        break;
      case "עדכון כמות": {
        const qtyMatch = log.details?.match(/מ-[\d.]+\s*ל-([\d.]+)/);
        if (qtyMatch) current.quantity = parseQuantity(qtyMatch[1]);
        current.deleted = false;
        break;
      }
      case "עדכון קטגוריה": {
        const categoryMatch = log.details?.match(/→\s*(.+)$/);
        if (categoryMatch) current.category = categoryMatch[1].trim();
        current.deleted = false;
        break;
      }
      case "עדכון מלאי מקנייה": {
        const qtyMatch = log.details?.match(/\+([\d.]+)/);
        if (qtyMatch) current.quantity += parseQuantity(qtyMatch[1]);
        current.deleted = false;
        break;
      }
      case "סימון כחסר":
      case "ביטול סימון חסר":
      case "עדכון מוצר":
      case "עדכון תמונה":
      case "העלאת תמונה":
        current.deleted = false;
        break;
      default:
        break;
    }

    products.set(name, current);
  }

  return products;
}

export function mergeProductNames(
  fromLogs: Map<string, RecoveredProductState>,
  extraNames: string[]
) {
  for (const rawName of extraNames) {
    const name = rawName.trim();
    if (!name || fromLogs.has(name)) continue;
    fromLogs.set(name, {
      name,
      quantity: 0,
      category: guessCategory(name),
      deleted: false,
    });
  }
  return fromLogs;
}

export function activeRecoveredProducts(map: Map<string, RecoveredProductState>) {
  return [...map.values()].filter((p) => !p.deleted);
}

export function defaultUnitForRecovered(category: string) {
  return defaultUnitForCategory(category);
}
