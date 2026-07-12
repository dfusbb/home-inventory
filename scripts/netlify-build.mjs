import { spawnSync } from "node:child_process";

function run(command, args) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const dbUrl = process.env.DATABASE_URL ?? "";

if (!dbUrl) {
  console.error(
    "\n❌ חסר DATABASE_URL ב-Netlify.\n" +
      "הוסיפו ב-Site configuration → Environment variables\n" +
      "ובחרו Scope: All scopes (או Builds + Functions)\n"
  );
  process.exit(1);
}

if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
  console.error(
    "\n❌ DATABASE_URL שגוי.\n" +
      "חייב להתחיל ב-postgresql:// (מ-Neon), לא SQLite.\n" +
      `התקבל: ${dbUrl.slice(0, 24)}...\n`
  );
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error(
    "\n❌ חסר JWT_SECRET ב-Netlify.\n" +
      "הוסיפו מחרוזת סודית ארוכה עם Scope: All scopes\n"
  );
  process.exit(1);
}

run("npx", ["prisma", "generate"]);
run("npx", ["prisma", "db", "push", "--accept-data-loss"]);
run("node", ["scripts/ensure-schema.mjs"]);
run("node", ["scripts/backfill-has-image.mjs"]);
run("npm", ["run", "build"]);
