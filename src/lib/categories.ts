export const DEFAULT_CATEGORIES = [
  "פירות",
  "ירקות",
  "קפואים",
  "חלב ומוצרי חלב",
  "לחם ומאפים",
  "בשר ודגים",
  "משקאות",
  "חד פעמי",
  "טואלטיקה",
  "ניקיון",
  "תבלינים ומזווה",
  "חטיפים ומתוקים",
  "אחר",
] as const;

/** @deprecated use DEFAULT_CATEGORIES */
export const CATEGORIES = DEFAULT_CATEGORIES;

export type Category = (typeof DEFAULT_CATEGORIES)[number];

const CATEGORY_RULES: { category: Category; keywords: string[] }[] = [
  {
    category: "פירות",
    keywords: [
      "תפוח", "בננה", "תפוז", "ענב", "אבטיח", "מלון", "אגס", "תות", "מנגו",
      "אפרסק", "שזיף", "רימון", "לימון", "אשכולית", "קיווי", "אננס", "תמר",
      "דובדבן", "משמש", "נectarine", "פפאיה",
    ],
  },
  {
    category: "ירקות",
    keywords: [
      "עגבנ", "מלפפון", "גזר", "בצל", "שום", "תפוח אדמה", "תפו\"א", "חסה",
      "פלפל", "כרוב", "ברוקולי", "קישוא", "חציל", "סלרי", "צנון", "צנונית",
      "בטטה", "דלעת", "פטרוזיליה", "כוסברה", "שמיר", "בזיליקום", "תרד",
      "ארטישוק", "סלק", "שומר", "קולורבי",
    ],
  },
  {
    category: "קפואים",
    keywords: ["קפוא", "גלידה", "פיצה קפואה", "שניצל קפוא", "ירקות קפואים"],
  },
  {
    category: "חלב ומוצרי חלב",
    keywords: [
      "חלב", "גבינה", "יוגורט", "שמנת", "חמאה", "קוטג", "לבן", "מעדן",
      "גבינת", "מוצרלה",
    ],
  },
  {
    category: "לחם ומאפים",
    keywords: ["לחם", "פיתה", "חלה", "בגט", "לחמניה", "קרואסון", "עוגה", "ביסקוויט", "עוגיות"],
  },
  {
    category: "בשר ודגים",
    keywords: [
      "עוף", "בשר", "סטייק", "המבורגר", "נקניק", "סלמי", "פסטרמה", "כבד",
      "דג", "סלמון", "טונה", "נסיכה", "אמנון", "דניס", "שניצל",
    ],
  },
  {
    category: "משקאות",
    keywords: [
      "מים", "מיץ", "קולה", "ספרייט", "פאנטה", "בירה", "יין", "שתייה",
      "אנרגיה", "משקה", "תה", "קפה",
    ],
  },
  {
    category: "חד פעמי",
    keywords: [
      "צלחת חד פעמי", "כוס חד פעמי", "מזלג חד פעמי", "סכין חד פעמי",
      "מפית", "נייר אלומיניום", "נילון", "שקית", "חד פעמי", "מגב חד פעמי",
    ],
  },
  {
    category: "טואלטיקה",
    keywords: [
      "נייר טואלט", "מגבונים", "סבון", "שמפו", "מרכך", "משחת שיניים",
      "מברשת שיניים", "דאודורנט", "קרם", "טמפון", "פד", "חיתול", "מגבת",
    ],
  },
  {
    category: "ניקיון",
    keywords: [
      "אקונומיקה", "סבון כלים", "מסיר שומנים", "אבקת כביסה", "מרכך כביסה",
      "מטהר", "ספוג", "מטלית", "שמפו שטיחים", "ניקוי",
    ],
  },
  {
    category: "תבלינים ומזווה",
    keywords: [
      "אורז", "פסטה", "קמח", "סוכר", "מלח", "שמן", "חומץ", "קטשופ",
      "מיונז", "חרדל", "רסק", "טחינה", "חומוס", "שעועית", "עדשים",
      "קפה", "תה", "דבש", "ריבה", "קורנפלקס", "גרנולה", "אטריות",
      "תבלין", "פפריקה", "כורכום", "זעתר",
    ],
  },
  {
    category: "חטיפים ומתוקים",
    keywords: [
      "שוקולד", "חטיף", "במבה", "ביסלי", "צ'יפס", "חטיף", "סוכריה",
      "מסטיק", "וופל", "עוגיות", "קרקר", "פופקורן", "מתוק",
    ],
  },
];

export function guessCategory(name: string): Category {
  const normalized = name.trim().toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw.toLowerCase()))) {
      return rule.category;
    }
  }
  return "אחר";
}

export function categorySortIndex(
  category: string,
  categoryOrder: readonly string[] = DEFAULT_CATEGORIES
): number {
  const idx = categoryOrder.indexOf(category);
  return idx === -1 ? categoryOrder.length : idx;
}

export function sortProductsByCategory<T extends { category: string; name: string }>(
  products: T[],
  categoryOrder: readonly string[] = DEFAULT_CATEGORIES
): T[] {
  return [...products].sort((a, b) => {
    const catDiff =
      categorySortIndex(a.category, categoryOrder) -
      categorySortIndex(b.category, categoryOrder);
    if (catDiff !== 0) return catDiff;
    return a.name.localeCompare(b.name, "he");
  });
}

export function groupByCategory<T extends { category: string }>(
  products: T[],
  categoryOrder: readonly string[] = DEFAULT_CATEGORIES
): { category: string; items: T[] }[] {
  const sorted = sortProductsByCategory(
    products as (T & { name: string })[],
    categoryOrder
  );
  const groups: { category: string; items: T[] }[] = [];
  for (const product of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.category === product.category) {
      last.items.push(product);
    } else {
      groups.push({ category: product.category, items: [product] });
    }
  }
  return groups;
}

export function groupByStore<T extends { store?: string | null }>(
  items: T[],
  storeOrder: string[] = []
): { store: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.store?.trim() || "ללא חנות";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const result: { store: string; items: T[] }[] = [];
  for (const name of storeOrder) {
    if (map.has(name)) {
      result.push({ store: name, items: map.get(name)! });
      map.delete(name);
    }
  }

  const remaining = [...map.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "he")
  );
  for (const [store, groupItems] of remaining) {
    result.push({ store, items: groupItems });
  }

  return result;
}

export function groupByStoreThenCategory<
  T extends { store?: string | null; category: string },
>(
  items: T[],
  storeOrder: string[],
  categoryOrder: readonly string[] = DEFAULT_CATEGORIES
): { store: string; categories: { category: string; items: T[] }[] }[] {
  return groupByStore(items, storeOrder).map(({ store, items: storeItems }) => ({
    store,
    categories: groupByCategory(storeItems, categoryOrder),
  }));
}

export function normalizeProductName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
