export function requestSearch(search: string) {
  const id = new URLSearchParams(search).get("request");
  return id &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
    ? "?" + new URLSearchParams({ request: id })
    : "";
}
export const mobileSections = [
  "",
  "permohonan",
  "misi",
  "penilaian",
  "fasilitas",
  "sumber-daya",
  "laporan",
  "outbox",
  "pengaturan",
  "helikopter",
];
export function mobileDestination(value: unknown) {
  if (typeof value !== "string") return "/mobile";
  const url = new URL(value, "https://local.invalid");
  if (url.origin !== "https://local.invalid") return "/mobile";
  const path = url.pathname.replace(/\/+$/, "");
  return [
    "/mobile",
    "/mobile/misi",
    "/mobile/peta",
    "/mobile/permohonan",
  ].includes(path) ||
    mobileSections.some((s) => path === "/mobile/operasi" + (s ? "/" + s : ""))
    ? path + requestSearch(url.search)
    : "/mobile";
}
