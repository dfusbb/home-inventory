interface ShoppingPDFItem {
  name: string;
  quantity: number;
}

interface ShoppingPDFOptions {
  familyName: string;
  shopperName: string;
  items: ShoppingPDFItem[];
  date: Date;
}

const HEBREW_FONT_FILE = "NotoSansHebrew-Regular.ttf";
const HEBREW_FONT_NAME = "NotoSansHebrew";

let cachedFontBase64: string | null = null;

async function loadHebrewFontBase64(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;

  const res = await fetch(`/fonts/${HEBREW_FONT_FILE}`);
  if (!res.ok) {
    throw new Error("Failed to load Hebrew font");
  }

  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  cachedFontBase64 = btoa(binary);
  return cachedFontBase64;
}

async function setupHebrewPdfFont(doc: import("jspdf").jsPDF) {
  const base64 = await loadHebrewFontBase64();
  doc.addFileToVFS(HEBREW_FONT_FILE, base64);
  doc.addFont(HEBREW_FONT_FILE, HEBREW_FONT_NAME, "normal");
  doc.setFont(HEBREW_FONT_NAME);
}

export async function generateShoppingPDF({
  familyName,
  shopperName,
  items,
  date,
}: ShoppingPDFOptions) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  await setupHebrewPdfFont(doc);

  const dateStr = date.toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  doc.setR2L(true);

  doc.setFontSize(20);
  doc.text("רשימת קניות", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.text(`משפחת ${familyName}`, 105, 32, { align: "center" });
  doc.text(`קונה: ${shopperName}`, 105, 40, { align: "center" });
  doc.text(dateStr, 105, 48, { align: "center" });

  autoTable(doc, {
    startY: 58,
    head: [["#", "מוצר", "כמות", "✓"]],
    body: items.map((item, i) => [
      String(i + 1),
      item.name,
      String(item.quantity),
      "☐",
    ]),
    styles: {
      font: HEBREW_FONT_NAME,
      fontSize: 11,
      halign: "right",
    },
    headStyles: {
      fillColor: [37, 99, 235],
      halign: "center",
      font: HEBREW_FONT_NAME,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      2: { halign: "center", cellWidth: 25 },
      3: { halign: "center", cellWidth: 20 },
    },
    margin: { right: 14, left: 14 },
  });

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
  const filename = `shopping-list-${datePart}.pdf`;
  doc.save(filename);
}
