export type QuantityUnit = "unit" | "kg";

export function normalizeQuantityUnit(value: unknown): QuantityUnit {
  return value === "kg" ? "kg" : "unit";
}

export function unitLabel(unit: QuantityUnit): string {
  return unit === "kg" ? "ק״ג" : "יחידות";
}

export function saleModeLabel(unit: QuantityUnit): string {
  return unit === "kg" ? "לפי משקל (ק״ג)" : "לפי אריזה / יחידות";
}

export function priceUnitLabel(unit: QuantityUnit): string {
  return unit === "kg" ? "לק״ג" : "ליחידה";
}

export function quantityStep(unit: QuantityUnit): number {
  return unit === "kg" ? 0.5 : 1;
}

export function formatQuantity(quantity: number, unit: QuantityUnit): string {
  const formatted = Number.isInteger(quantity)
    ? String(quantity)
    : quantity.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${formatted} ${unitLabel(unit)}`;
}

export function defaultUnitForCategory(category: string): QuantityUnit {
  return ["פירות", "ירקות", "בשר ודגים"].includes(category) ? "kg" : "unit";
}
