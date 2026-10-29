import type { RecordData } from "../types";
import { missionStages } from "../lib/domain";
export default function MissionControls({
  mission,
  busy,
  act,
}: {
  mission: RecordData;
  busy: boolean;
  act: (action: string, p: Record<string, unknown>) => Promise<any>;
}) {
  if (["Selesai", "Dibatalkan"].includes(mission.status)) return null;
  const next = missionStages[missionStages.indexOf(mission.status) + 1];
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act("missions.transition", {
            id: mission.id,
            baseRevision: mission.revision,
            status: next,
            reason: new FormData(e.currentTarget).get("reason"),
          });
        }}
      >
        <label>
          Alasan override penyelesaian (opsional)
          <input name="reason" maxLength={500} />
        </label>
        <button disabled={busy}>Misi → {next}</button>
      </form>
      {["Persiapan", "Tim Ditugaskan"].includes(mission.status) && (
        <details>
          <summary>Ubah tim sebelum keberangkatan</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void act("missions.reassign", {
                id: mission.id,
                baseRevision: mission.revision,
                team: form.get("team"),
                reason: form.get("reason"),
              });
            }}
          >
            <label>
              Nama tim pengganti
              <input
                name="team"
                required
                maxLength={150}
                defaultValue={String(mission.team ?? "")}
              />
            </label>
            <label>
              Alasan perubahan tim
              <textarea name="reason" required maxLength={500} />
            </label>
            <button disabled={busy}>Simpan penugasan tim</button>
          </form>
        </details>
      )}
      <details>
        <summary>Pembatalan misi simulasi</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act("missions.transition", {
              id: mission.id,
              baseRevision: mission.revision,
              status: "Dibatalkan",
              reason: new FormData(e.currentTarget).get("reason"),
            });
          }}
        >
          <label>
            Alasan pembatalan
            <textarea name="reason" required maxLength={500} />
          </label>
          <button className="danger" disabled={busy}>
            Batalkan misi simulasi
          </button>
        </form>
      </details>
    </>
  );
}
