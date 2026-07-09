import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Copy generated 512 icon to public/icons and resources
const sourceIcon = join(root, "assets", "icon-512.png");
const publicIcons = join(root, "public", "icons");
const resources = join(root, "resources");

mkdirSync(publicIcons, { recursive: true });
mkdirSync(resources, { recursive: true });

if (existsSync(sourceIcon)) {
  const buf = readFileSync(sourceIcon);
  writeFileSync(join(publicIcons, "icon-512.png"), buf);
  writeFileSync(join(publicIcons, "icon-192.png"), buf);
  writeFileSync(join(resources, "icon.png"), buf);
  console.log("Icons copied successfully");
} else {
  console.log("Run icon generation first - using placeholder note in README");
}
