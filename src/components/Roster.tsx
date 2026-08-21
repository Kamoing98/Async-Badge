import { fmtClock } from "../sim/core";
import { SimState } from "../sim/useSimulation";
import { MiniQR, PassPill, StatusChip } from "./bits";

export function Roster({ sim }: { sim: SimState }) {
  const done = sim.attendees.filter((a) => a.status === "checked_in").length;
  return (
    <section className="panel overflow-hidden" aria-label="Attendee manifest">
      <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
        <div>
          <div className="label-caps">Day 2 · Hall C · manifest</div>
          <h2 className="mt-0.5 font-display text-lg font-bold tracking-wide text-snow">
            ATTENDEE MANIFEST
          </h2>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-bold tabular-nums text-mint">
            {done}<span className="text-fog-dim">/{sim.attendees.length}</span>
          </div>
          <div className="label-caps !text-[8px]">checked in</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-edge-soft font-mono text-[9px] tracking-[0.2em] text-fog-dim">
              <th className="px-4 py-2 font-medium">QR / ID</th>
              <th className="px-2 py-2 font-medium">ATTENDEE</th>
              <th className="px-2 py-2 font-medium">PASS</th>
              <th className="px-2 py-2 text-center font-medium">SCANS</th>
              <th className="px-2 py-2 font-medium">STATE</th>
              <th className="px-4 py-2 text-right font-medium">BADGE JOB</th>
            </tr>
          </thead>
          <tbody>
            {sim.attendees.map((a) => (
              <tr
                key={a.id + a.status + (a.completedJobId ?? "")}
                className={`border-b border-edge-soft/60 transition-colors last:border-0 hover:bg-ink-800/70 ${
                  a.status === "checked_in" ? "row-flash" : a.status === "failed" ? "row-flash-amber" : ""
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <MiniQR seed={a.id} size={26} className="text-snow/60" />
                    <span className="font-mono text-[10px] text-fog">{a.id}</span>
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  <div className="text-[13px] font-semibold text-snow">{a.name}</div>
                  <div className="font-mono text-[10px] text-fog-dim">{a.company}</div>
                </td>
                <td className="px-2 py-2.5">
                  <PassPill pass={a.pass} />
                </td>
                <td className="px-2 py-2.5 text-center">
                  <span className={`font-mono text-[12px] tabular-nums ${a.scans > 1 ? "font-semibold text-sun" : "text-fog"}`}>
                    {a.scans}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <StatusChip status={a.status} />
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-[10px] text-fog">
                  {a.completedJobId ? (
                    <span className="text-mint">
                      {a.completedJobId} · {a.checkedInAt ? fmtClock(a.checkedInAt) : ""}
                    </span>
                  ) : a.activeJobId ? (
                    <span className="text-sun">{a.activeJobId} · in flight</span>
                  ) : (
                    <span className="text-fog-dim">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
