import { scenarioDefinitions, isScenarioKey } from "../lib/scenarios";
import { Link } from "react-router-dom";
import type { Actor, RecordData, Operation } from "../types";
import { mode } from "../services/api";
import { canReadTable } from "../lib/permissions";
import { StatusBadge } from "./MobileUI";
import { checklistItems, date } from "../lib/domain";
export default function WorkflowSummary({
  request,
  mission,
  tables,
  actor,
  pending,
}: {
  request: RecordData;
  mission?: RecordData;
  tables: Record<string, RecordData[]>;
  actor: Actor;
  pending: Operation[];
}) {
  const related = (table: string) =>
    (tables[table] ?? []).filter(
      (r) =>
        r.requestId === request.id &&
        (!mission || !r.missionId || r.missionId === mission.id),
    );
  const medical = related("MedicalReviews").at(-1);
  const flight = related("FlightReviews").at(-1);
  const checklist = related("Checklists").at(-1);
  const queued = pending.filter(
    (p) =>
      p.entityId === request.id ||
      p.entityId === mission?.id ||
      (p.payload.data as Record<string, unknown>)?.requestId === request.id ||
      p.payload.requestId === request.id,
  );
  const link = "?" + new URLSearchParams({ request: request.id });
  return (
    <section className="workflow-summary" aria-label="Kelengkapan koordinasi">
      <h3>Kelengkapan & tindakan berikutnya</h3>
      {mode === "demo" &&
        typeof request.demoScenario === "string" &&
        isScenarioKey(request.demoScenario) && (
          <p className="badge">
            Paket latihan: {scenarioDefinitions[request.demoScenario].title} ·
            riwayat sintetis
          </p>
        )}
      <p className="storage-status">
        Sumber record:{" "}
        {mode === "demo" ? "Tersimpan di perangkat" : "Tersinkron ke server"}.
        Status proses terpisah dari pengiriman.
      </p>
      {queued.length > 0 && (
        <p className="notice">
          {queued.length} operasi milik peran ini masih di Outbox.{" "}
          <Link to={"/mobile/operasi/outbox" + link}>Tinjau pengiriman</Link>
        </p>
      )}
      <dl>
        <div>
          <dt>Status proses permohonan</dt>
          <dd>
            <StatusBadge status={request.status} />
          </dd>
        </div>
        <div>
          <dt>Penilaian medis</dt>
          <dd>
            {medical ? (
              <StatusBadge status={medical.status} />
            ) : (
              "Belum tercatat · Koordinator medis"
            )}
          </dd>
        </div>
        <div>
          <dt>Tinjauan penerbangan</dt>
          <dd>
            {flight ? (
              <StatusBadge status={flight.status} />
            ) : (
              "Belum tercatat · Koordinator penerbangan"
            )}
          </dd>
        </div>
        <div>
          <dt>Misi terkait</dt>
          <dd>
            {mission ? (
              <Link to={"/mobile/misi" + link}>
                Buka misi {mission.id.slice(0, 8)}
              </Link>
            ) : (
              "Belum dibentuk. Operator menerima, memverifikasi dan mengoordinasikan permohonan sebelum menetapkan tim."
            )}
          </dd>
        </div>
      </dl>
      <p>
        Rekomendasi medis bukan persetujuan penerbangan.{" "}
        <Link to={"/mobile/operasi/penilaian" + link}>
          Buka penilaian & koordinasi
        </Link>
      </p>
      {mission && (
        <>
          <h3>Penugasan terkait</h3>
          {!!mission.aircraftId && (
            <p>
              <Link
                to={
                  "/mobile/operasi/helikopter?" +
                  new URLSearchParams({ aircraft: String(mission.aircraftId) })
                }
              >
                Buka helikopter terkait
              </Link>
            </p>
          )}
          <p>
            Tim: {String(mission.team)}. Helikopter:{" "}
            {String(
              (tables.Aircraft ?? []).find((a) => a.id === mission.aircraftId)
                ?.name ?? "Belum ditetapkan",
            )}
            . Fasilitas penerima:{" "}
            {String(
              (tables.Facilities ?? []).find(
                (f) => f.id === mission.receivingFacilityId,
              )?.name ?? "Belum ditetapkan",
            )}
            .
          </p>
          <p>
            Sumber daya:{" "}
            {Array.isArray(mission.resourceIds)
              ? mission.resourceIds
                  .map((id) =>
                    String(
                      (tables.Resources ?? []).find((r) => r.id === id)?.name ??
                        "Referensi tidak ditemukan",
                    ),
                  )
                  .join(", ")
              : "Belum ditautkan ke direktori"}
            .{" "}
            <Link to={"/mobile/operasi/sumber-daya" + link}>
              Tinjau kesiapan
            </Link>
          </p>
          <p>
            Daftar periksa:{" "}
            {checklist
              ? checklistItems.filter(
                  (i) => (checklist.items as Record<string, boolean>)?.[i.id],
                ).length
              : 0}
            /{checklistItems.length} butir tersimpan.
          </p>
          {canReadTable(actor, "PatientNotes") && (
            <div>
              <h3>Catatan perkembangan</h3>
              {related("PatientNotes").length ? (
                related("PatientNotes").map((n) => (
                  <p key={n.id}>
                    {String(n.text)} · {date(n.updatedAt)}
                  </p>
                ))
              ) : (
                <p>Belum tercatat · Dokter/perawat.</p>
              )}
            </div>
          )}
          <h3>Serah terima</h3>
          <p>
            Jumlah pasien pada permohonan: {String(request.patients)}. Catatan
            serah terima terkait: {related("HandoverRecords").length}. Jumlah
            catatan bukan jumlah pasien yang diserahterimakan.
          </p>
          {related("HandoverRecords").length ? (
            related("HandoverRecords").map((h) => (
              <p key={h.id}>
                {String(h.text)} · {date(h.updatedAt)}
              </p>
            ))
          ) : (
            <p>
              Belum tercatat. Dokter/perawat atau Rumah sakit penerima dapat
              mencatat serah terima yang terkait misi ini.
            </p>
          )}
        </>
      )}
    </section>
  );
}
