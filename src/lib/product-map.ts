import { normalizeQuantityUnit, type QuantityUnit } from "@/lib/units";

export interface ProductListItem {
  id: string;
  name: string;
  quantity: number;
  quantityUnit: QuantityUnit;
  unitPrice: number | null;
  packagePrice: number | null;
  packageWeight: number | null;
  unitCount: number | null;
  category: string;
  store: string | null;
  hasImage: boolean;
  isMissing: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function toProductListItem(product: {
  id: string;
  name: string;
  quantity: number | null;
  quantityUnit?: string | null;
  unitPrice?: number | null;
  packagePrice?: number | null;
  packageWeight?: number | null;
  unitCount?: number | null;
  category: string;
  store?: string | null;
  hasImage?: boolean | null;
  imageUrl?: string | null;
  isMissing: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}): ProductListItem {
  return {
    id: product.id,
    name: product.name,
    quantity: Number(product.quantity) || 0,
    quantityUnit: normalizeQuantityUnit(product.quantityUnit),
    unitPrice: product.unitPrice ?? null,
    packagePrice: product.packagePrice ?? null,
    packageWeight: product.packageWeight ?? null,
    unitCount: product.unitCount ?? null,
    category: product.category,
    store: product.store ?? null,
    hasImage: Boolean(product.hasImage ?? product.imageUrl),
    isMissing: product.isMissing,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export function toShoppingItemResponse<
  T extends {
    product: Parameters<typeof toProductListItem>[0] | null;
    quantityUnit?: string | null;
  },
>(item: T) {
  return {
    ...item,
    quantityUnit: normalizeQuantityUnit(item.quantityUnit),
    product: item.product ? toProductListItem(item.product) : null,
  };
}
