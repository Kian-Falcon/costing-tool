import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const helveticaPath = require.resolve("pdfkit/js/data/Helvetica.afm");
const sourceDir = path.dirname(helveticaPath);
const targetDir = path.join(process.cwd(), ".next", "server", "chunks", "data");

mkdirSync(targetDir, { recursive: true });

for (const file of readdirSync(sourceDir)) {
  if (!file.endsWith(".afm") && !file.endsWith(".icc")) continue;
  copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
}

if (!existsSync(path.join(targetDir, "Helvetica.afm"))) {
  throw new Error("Could not copy PDFKit Helvetica.afm into the Next.js server bundle.");
}

console.log(`Copied PDFKit font data to ${targetDir}`);
