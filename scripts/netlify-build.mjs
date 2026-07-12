import { spawnSync } from "node:child_process";

function run(command, args, env = process.env, optional = false) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (result.status !== 0) {
    if (optional) {
      console.warn(`⚠️ Skipped optional step: ${command} ${args.join(" ")}`);
      return;
    }
    process.exit(result.status ?? 1);
  }
}

function normalizeDatabaseUrl(url) {
  return url
    .replace("-pooler.", ".")
    .replace(/[?&]channel_binding=require/g, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");
}

const dbUrl = process.env.DATABASE_URL ?? "";

if (!dbUrl) {
  console.error(
    "\n❌ חסר DATABASE_URL ב-Netlify.\n" +
      "הוסיפו ב-Project configuration → Environment variables\n" +
      "ובחרו Scope: All scopes\n"
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
  console.warn(
    "\n⚠️ JWT_SECRET חסר – הוסיפו ב-Netlify (All scopes) כדי שההתחברות תעבוד.\n"
  );
}

const buildEnv = {
  ...process.env,
  DATABASE_URL: normalizeDatabaseUrl(dbUrl),
};

console.log("Syncing database schema (optional)...");
run("npx", ["prisma", "generate"], buildEnv);
run("npx", ["prisma", "db", "push", "--accept-data-loss"], buildEnv, true);
run("node", ["scripts/ensure-schema.mjs"], buildEnv, true);
run("node", ["scripts/backfill-has-image.mjs"], buildEnv, true);
run("npm", ["run", "build"], buildEnv);
