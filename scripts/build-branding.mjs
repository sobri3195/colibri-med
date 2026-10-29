import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const logo = path.join(root, "design/colibri-med-logo.png");
const icon = path.join(root, "design/colibri-med-icon.png");
mkdirSync(path.join(root, "public/branding"), { recursive: true });

function convert(args) {
  const result = spawnSync("magick", args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error("Konversi aset branding gagal");
}
function resize(source, size, output) {
  convert([
    source,
    "-strip",
    "-filter",
    "Lanczos",
    "-resize",
    `${size}x${size}`,
    output,
  ]);
}
for (const size of [96, 192])
  resize(logo, size, `public/branding/colibri-med-mark-${size}.png`);
resize(logo, 512, "public/branding/colibri-med-logo-512.png");
for (const size of [192, 512])
  resize(icon, size, `public/branding/colibri-med-icon-${size}.png`);
for (const size of [16, 32])
  resize(icon, size, `public/favicon-${size}x${size}.png`);
resize(icon, 180, "public/apple-touch-icon.png");
convert([
  icon,
  "-strip",
  "-define",
  "icon:auto-resize=48,32,16",
  "public/favicon.ico",
]);
