import { groupByCategory } from "@/lib/categories";

export interface PDFLineItem {
  name: string;
  quantity: number;
  category: string;
  store?: string | null;
  unitPrice?: number | null;
  stockQuantity?: number;
}

export interface PDFOptions {
  title: string;
  familyName: string;
  subtitle?: string;
  items: PDFLineItem[];
  categories: string[];
  stores?: string[];
  groupBy?: "category" | "store";
  showStock?: boolean;
  date: Date;
}

const HEBREW_FONT_FILE = "NotoSansHebrew-Regular.ttf";
const HEBREW_FONT_NAME = "NotoSansHebrew";

let cachedFontBase64: string | null = null;

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "—";
  return `₪${price.toFixed(2)}`;
}

function lineTotal(qty: number, price: number | null | undefined): string {
  if (price === null || price === undefined) return "—";
  return formatPrice(qty * price);
}

async function loadHebrewFontBase64(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;
  const res = await fetch(`/fonts/${HEBREW_FONT_FILE}`);
  if (!res.ok) throw new Error("Failed to load Hebrew font");
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  cachedFontBase64 = btoa(binary);
  return cachedFontBase64;
}

async function setupHebrewPdfFont(doc: import("jspdf").jsPDF) {
  const base64 = await loadHebrewFontBase64();
  doc.addFileToVFS(HEBREW_FONT_FILE, base64);
  doc.addFont(HEBREW_FONT_FILE, HEBREW_FONT_NAME, "normal");
  doc.addFont(HEBREW_FONT_FILE, HEBREW_FONT_NAME, "bold");
  doc.setFont(HEBREW_FONT_NAME, "normal");
}

const tableStyles = {
  font: HEBREW_FONT_NAME,
  fontStyle: "normal" as const,
  fontSize: 10,
  halign: "right" as const,
  overflow: "linebreak" as const,
  cellPadding: 2,
};

const tableHeadStyles = {
  fillColor: [37, 99, 235] as [number, number, number],
  textColor: [255, 255, 255] as [number, number, number],
  halign: "center" as const,
  font: HEBREW_FONT_NAME,
  fontStyle: "normal" as const,
  fontSize: 10,
};

function groupByStore<T extends { store?: string | null }>(
  items: T[],
  storeOrder: string[] = []
): { label: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.store?.trim() || "ללא חנות";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  const result: { label: string; items: T[] }[] = [];
  for (const name of storeOrder) {
    if (map.has(name)) {
      result.push({ label: name, items: map.get(name)! });
      map.delete(name);
    }
  }
  for (const [label, groupItems] of map) {
    result.push({ label, items: groupItems });
  }
  return result;
}

export async function generatePDF({
  title,
  familyName,
  subtitle,
  items,
  categories,
  stores = [],
  groupBy = "category",
  showStock = false,
  date,
}: PDFOptions) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  await setupHebrewPdfFont(doc);
  doc.setR2L(true);

  const dateStr = date.toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  doc.setFontSize(18);
  doc.text(title, 105, 18, { align: "center" });
  doc.setFontSize(11);
  doc.text(`משפחת ${familyName}`, 105, 28, { align: "center" });
  if (subtitle) doc.text(subtitle, 105, 36, { align: "center" });
  doc.text(dateStr, 105, subtitle ? 44 : 36, { align: "center" });

  let startY = subtitle ? 52 : 44;
  let rowNum = 0;
  let totalEstimate = 0;

  const head = showStock
    ? [["#", "מוצר", "במלאי", "מחיר", "קטגוריה"]]
    : [["#", "מוצר", "כמות", "מחיר", "סהכ", "חנות"]];

  const renderTable = (tableItems: PDFLineItem[]) => {
    const body = tableItems.map((item) => {
      rowNum += 1;
      const price = item.unitPrice ?? null;
      if (!showStock && price !== null) totalEstimate += item.quantity * price;

      if (showStock) {
        return [
          String(rowNum),
          item.name,
          String(item.stockQuantity ?? 0),
          formatPrice(price),
          item.category,
        ];
      }
      return [
        String(rowNum),
        item.name,
        String(item.quantity),
        formatPrice(price),
        lineTotal(item.quantity, price),
        item.store?.trim() || "—",
      ];
    });

    autoTable(doc, {
      startY,
      head,
      body,
      styles: tableStyles,
      headStyles: tableHeadStyles,
      columnStyles: showStock
        ? {
            0: { halign: "center", cellWidth: 12 },
            1: { cellWidth: 55 },
            2: { halign: "center", cellWidth: 18 },
            3: { halign: "center", cellWidth: 22 },
            4: { halign: "right", cellWidth: 28 },
          }
        : {
            0: { halign: "center", cellWidth: 10 },
            1: { cellWidth: 48 },
            2: { halign: "center", cellWidth: 16 },
            3: { halign: "center", cellWidth: 20 },
            4: { halign: "center", cellWidth: 22 },
            5: { halign: "right", cellWidth: 28 },
          },
      margin: { right: 10, left: 10 },
    });

    startY =
      (doc as import("jspdf").jsPDF & { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 8;
  };

  const sectionHeader = (label: string) => {
    if (startY > 260) {
      doc.addPage();
      startY = 20;
    }
    doc.setFont(HEBREW_FONT_NAME);
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text(label, 200, startY, { align: "right" });
    doc.setTextColor(0, 0, 0);
    startY += 7;
  };

  if (groupBy === "store") {
    const storeGroups = groupByStore(items, stores);
    for (const group of storeGroups) {
      sectionHeader(group.label);
      const byCat = groupByCategory(
        group.items.map((i) => ({ ...i, name: i.name })),
        categories
      );
      for (const cat of byCat) {
        if (byCat.length > 1) sectionHeader(`  ${cat.category}`);
        renderTable(cat.items);
      }
    }
  } else {
    const catGroups = groupByCategory(items, categories);
    for (const group of catGroups) {
      sectionHeader(group.category);
      renderTable(group.items);
    }
  }

  if (!showStock && totalEstimate > 0) {
    doc.setFont(HEBREW_FONT_NAME);
    doc.setFontSize(12);
    doc.text(
      `סה"כ משוער: ${formatPrice(totalEstimate)}`,
      105,
      doc.internal.pageSize.height - 18,
      { align: "center" }
    );
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont(HEBREW_FONT_NAME);
    doc.setFontSize(8);
    doc.text(
      `נוצר ע"י אפליקציית ניהול מלאי הבית · עמוד ${i}/${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }

  const datePart = date.toISOString().split("T")[0];
  doc.save(`${title}-${datePart}.pdf`);
}

export async function generateShoppingPDF(opts: {
  familyName: string;
  shopperName: string;
  items: PDFLineItem[];
  categories: string[];
  stores?: string[];
  date: Date;
}) {
  return generatePDF({
    title: "רשימת-קניות",
    familyName: opts.familyName,
    subtitle: `קונה: ${opts.shopperName}`,
    items: opts.items,
    categories: opts.categories,
    stores: opts.stores,
    groupBy: "store",
    date: opts.date,
  });
}

export async function generateInventoryPDF(opts: {
  familyName: string;
  items: PDFLineItem[];
  categories: string[];
  date: Date;
}) {
  return generatePDF({
    title: "מלאי-הבית",
    familyName: opts.familyName,
    items: opts.items,
    categories: opts.categories,
    groupBy: "category",
    showStock: true,
    date: opts.date,
  });
}
