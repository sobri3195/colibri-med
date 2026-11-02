import type { Actor, Role } from "../types";
const operational: Role[] = [
  "Operator",
  "Koordinator medis",
  "Koordinator penerbangan",
  "Dokter/perawat",
  "Rumah sakit penerima",
  "Administrator",
];
const mutations: Record<string, Role[]> = {
  "requests.create": operational,
  "requests.update": ["Operator"],
  "requests.transition": ["Operator"],
  "missions.assign": ["Operator"],
  "missions.reassign": ["Operator"],
  "missions.transition": ["Operator"],
  "medicalReviews.save": ["Koordinator medis"],
  "flightReviews.save": ["Koordinator penerbangan"],
  "patientNotes.create": ["Dokter/perawat"],
  "checklists.save": ["Dokter/perawat", "Koordinator penerbangan"],
  "handovers.save": ["Dokter/perawat", "Rumah sakit penerima"],
  "resources.update": ["Operator"],
  "resources.create": [],
  "facilities.create": [],
  "facilities.update": [],
  "aircraftReports.create": ["Koordinator penerbangan", "Dokter/perawat"],
};
const readGroups = [
  "requests",
  "missions",
  "medicalReviews",
  "flightReviews",
  "patientNotes",
  "checklists",
  "handovers",
  "resources",
  "facilities",
  "activity",
  "aircraft",
  "aircraftReports",
];
export function canReadTable(actor: Actor | null, table: string) {
  if (!actor || !operational.includes(actor.role)) return false;
  return (
    table !== "PatientNotes" ||
    ["Dokter/perawat", "Koordinator medis", "Administrator"].includes(
      actor.role,
    )
  );
}
export function canAction(actor: Actor | null, action: string): boolean {
  if (action === "auth.me") return !!actor;
  if (action === "requests.create" && !actor) return true;
  if (!actor) return false;
  if (action === "leadership.summary")
    return ["Administrator", "Viewer pimpinan"].includes(actor.role);
  if (actor.role === "Viewer pimpinan") return false;
  if (["reports.summary", "aircraft.snapshot"].includes(action))
    return operational.includes(actor.role);
  const [group, verb] = action.split(".");
  if (readGroups.includes(group) && ["list", "get"].includes(verb))
    return canReadTable(
      actor,
      group === "patientNotes" ? "PatientNotes" : group,
    );
  return (
    Object.hasOwn(mutations, action) &&
    (actor.role === "Administrator" || mutations[action].includes(actor.role))
  );
}
export const canManageScenarios = (actor: Actor | null) =>
  !!actor && ["Administrator", "Operator"].includes(actor.role);
