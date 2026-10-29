import { readdir, readFile } from "node:fs/promises";
const forbidden = [
  "APPS_SCRIPT_SHARED_SECRET",
  "PROXY_SHARED_SECRET",
  "SERVER_ONLY_CANARY_COLIBRI",
];
for (const path of await readdir("dist", { recursive: true })) {
  if (!/\.(js|html|css)$/.test(path)) continue;
  const content = await readFile("dist/" + path, "utf8");
  if (forbidden.some((marker) => content.includes(marker)))
    throw Error(
      "Server-only configuration marker found in frontend bundle: " + path,
    );
}
console.log("Frontend bundle: no server-only configuration markers.");
