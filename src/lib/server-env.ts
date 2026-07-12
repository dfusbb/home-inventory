export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) return url;
  if (
    (url.startsWith("postgresql://") || url.startsWith("postgres://")) &&
    !url.includes("sslmode=")
  ) {
    return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
  }
  return url;
}

export function validateServerEnv():
  | { ok: true }
  | { ok: false; error: string } {
  const dbUrl = process.env.DATABASE_URL ?? "";

  if (!dbUrl) {
    return {
      ok: false,
      error:
        "השרת לא מוגדר: חסר DATABASE_URL ב-Netlify. הגדירו עם Scope: All scopes",
    };
  }

  if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
    return {
      ok: false,
      error:
        "DATABASE_URL שגוי בענן – חייב להיות postgresql:// מ-Neon (לא SQLite)",
    };
  }

  if (!process.env.JWT_SECRET) {
    return {
      ok: false,
      error:
        "השרת לא מוגדר: חסר JWT_SECRET ב-Netlify. הגדירו עם Scope: All scopes",
    };
  }

  return { ok: true };
}
