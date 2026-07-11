import type { ProductListItem } from "@/lib/product-map";
import { normalizeQuantityUnit, priceUnitLabel, type QuantityUnit } from "@/lib/units";

export function shoppingItemUnit(
  item: { quantityUnit?: string | null },
  product?: Pick<ProductListItem, "quantityUnit"> | null
): QuantityUnit {
  return normalizeQuantityUnit(item.quantityUnit ?? product?.quantityUnit);
}

export function shoppingItemPrice(
  item: { quantityUnit?: string | null; unitPrice?: number | null },
  product?: Pick<
    ProductListItem,
    "quantityUnit" | "unitPrice" | "packagePrice"
  > | null
): number | null {
  if (item.unitPrice != null) return item.unitPrice;
  if (!product) return null;
  const unit = shoppingItemUnit(item, product);
  if (unit === "kg") return product.unitPrice;
  return product.packagePrice ?? product.unitPrice;
}

export function shoppingItemPriceLabel(
  item: { quantityUnit?: string | null },
  product?: Pick<ProductListItem, "quantityUnit"> | null
): string {
  return priceUnitLabel(shoppingItemUnit(item, product));
}

export function inventoryIncrementForPurchase(
  item: { quantity: number; quantityUnit?: string | null },
  product: Pick<ProductListItem, "quantityUnit" | "packageWeight">
): number {
  const buyUnit = normalizeQuantityUnit(item.quantityUnit);
  if (buyUnit === "unit" && product.quantityUnit === "kg" && product.packageWeight) {
    return item.quantity * product.packageWeight;
  }
  return item.quantity;
}

export function inventoryUpdateForPurchase(
  item: { quantity: number; quantityUnit?: string | null },
  product: Pick<ProductListItem, "quantityUnit" | "packageWeight">
): { quantity?: number; unitCount?: number } {
  const buyUnit = normalizeQuantityUnit(item.quantityUnit);
  if (product.quantityUnit !== "kg") {
    return { quantity: item.quantity };
  }
  if (buyUnit === "kg") {
    return { quantity: item.quantity };
  }
  if (product.packageWeight) {
    return { quantity: item.quantity * product.packageWeight };
  }
  return { unitCount: item.quantity };
}
