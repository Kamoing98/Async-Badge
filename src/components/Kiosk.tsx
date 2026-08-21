import { useEffect, useState } from "react";
import { PASS_META, fmtClock, fmtStamp, initials } from "../sim/core";
import { SimState } from "../sim/useSimulation";
import { IconCheck, IconRetry, IconScan, MiniQR, PassPill, Scramble, StatusChip } from "./bits";

interface Props {
  sim: SimState;
  scan: (id: string) => void;
}

function DedupBanner({ sim }: { sim: SimState }) {
  const [visible, setVisible] = useState(false);
  const ls = sim.lastScan;

  useEffect(() => {
    if (!ls || ls.outcome === "published" || ls.outcome === "failed-retry") {
      setVisible(false);
      return;
    }
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 4200);
    return () => clearTimeout(id);
  }, [ls]);

  if (!visible || !ls) return null;
  const att = sim.attendees.find((a) => a.id === ls.attendeeId);
  return (
    <div className="pop-in flex items-start gap-2.5 border border-sun/40 bg-sun/10 px-3 py-2.5">
      <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-sun" aria-hidden>
        <path d="M12 3 2.5 20h19z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M12 9.5V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
      </svg>
      <div className="leading-snug">
        <div className="font-mono text-[11px] font-semibold tracking-wider text-sun">
          DUPLICATE SCAN BLOCKED — NO SECOND BADGE
        </div>
        <div className="mt-0.5 text-[12px] text-snow/85">
          {att?.name}:{" "}
          {ls.outcome === "dup-inflight"
            ? "a print job is already in flight for this attendee — request never reached the queue."
            : "already checked in — dedup guard rejected the reprint at the door."}
        </div>
      </div>
    </div>
  );
}

function BadgeCard({ sim }: { sim: SimState }) {
  const checkedIn = sim.attendees
    .filter((a) => a.status === "checked_in" && a.checkedInAt)
    .sort((a, b) => (b.checkedInAt ?? 0) - (a.checkedInAt ?? 0))[0];
  if (!checkedIn) return null;
  const band = PASS_META[checkedIn.pass].band;
  return (
    <div key={checkedIn.id + (checkedIn.checkedInAt ?? 0)} className="badge-print relative overflow-hidden border border-edge bg-ink-800">
      <div className="flex items-center justify-between border-b border-edge-soft px-3 py-1.5">
        <span className="font-mono text-[9px] tracking-[0.22em] text-fog">BADGE · RELEASED ON WEBHOOK 200</span>
        <span className="h-2.5 w-8 rounded-full border border-edge bg-ink-950" aria-hidden />
      </div>
      <div className="flex gap-3 p-3">
        <div className="w-1.5 self-stretch" style={{ background: band }} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold leading-tight text-snow">{checkedIn.name}</div>
          <div className="truncate font-mono text-[10px] text-fog">
            {checkedIn.company} · {checkedIn.id}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <PassPill pass={checkedIn.pass} />
            <span className="font-mono text-[9px] text-mint">✓ {checkedIn.completedJobId}</span>
          </div>
        </div>
        <MiniQR seed={checkedIn.id + checkedIn.completedJobId} size={52} className="shrink-0 text-snow/85" />
      </div>
      <div className="border-t border-edge-soft bg-ink-900/70 px-3 py-1 font-mono text-[9px] tracking-widest text-fog-dim">
        SOLSTICE ’26 · DAY 2 · ISSUED {checkedIn.checkedInAt ? fmtClock(checkedIn.checkedInAt) : ""}
      </div>
    </div>
  );
}

export function Kiosk({ sim, scan }: Props) {
  const busy = sim.attendees.some((a) => a.status === "queued" || a.status === "printing");
  const last = sim.lastScan ? sim.attendees.find((a) => a.id === sim.lastScan!.attendeeId) : undefined;
  const focus = last ?? sim.attendees[0];

  return (
    <section className="panel flex h-full flex-col overflow-hidden" aria-label="Scan station">
      <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
        <div>
          <div className="label-caps">Scan station 04 · badge kiosk</div>
          <h2 className="mt-0.5 font-display text-lg font-bold tracking-wide text-snow">
            <Scramble text="CHECK-IN" />
          </h2>
        </div>
        <span className={`inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[10px] tracking-widest ${busy ? "border-sun/40 bg-sun/10 text-sun" : "border-edge bg-ink-800 text-fog"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${busy ? "pulse-dot bg-sun" : "bg-fog-dim"}`} />
          {busy ? "JOB IN FLIGHT" : "IDLE"}
        </span>
      </div>

      {/* scan pad */}
      <div className="relative m-4 overflow-hidden border border-dashed border-edge bg-ink-950/60 px-4 py-3">
        {busy && (
          <span className="scan-beam pointer-events-none absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-sun/25 to-transparent" aria-hidden />
        )}
        <div className="flex items-center gap-2 text-teal">
          <IconScan className="h-4 w-4" />
          <span className="font-mono text-[10px] tracking-[0.2em]">TAP AN ATTENDEE QR TO SCAN</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {sim.attendees.map((a) => {
            const active = a.status === "queued" || a.status === "printing";
            return (
              <button
                key={a.id}
                onClick={() => scan(a.id)}
                className={`group flex items-center gap-2.5 border px-2.5 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/60 hover:bg-teal/5 active:translate-y-0 ${
                  active ? "border-sun/50 bg-sun/5" : a.status === "checked_in" ? "border-mint/30 bg-mint/5" : "border-edge-soft bg-ink-800"
                }`}
              >
                <MiniQR seed={a.id} size={30} className="shrink-0 text-snow/70 transition-colors group-hover:text-teal" />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[12px] font-semibold text-snow">{a.name}</span>
                  <span className="block font-mono text-[9px] text-fog-dim">{a.id}</span>
                </span>
                <span
                  className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${
                    a.status === "checked_in" ? "bg-mint" : active ? "pulse-dot bg-sun" : a.status === "failed" ? "bg-rose" : "bg-fog-dim"
                  }`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <DedupBanner sim={sim} />

        {/* focused attendee card */}
        <div className="border border-edge-soft bg-ink-900/60 p-3.5">
          <div className="flex items-start gap-3">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center border font-display text-sm font-bold"
              style={{ borderColor: PASS_META[focus.pass].band, color: PASS_META[focus.pass].band, background: "rgba(255,255,255,0.03)" }}
            >
              {initials(focus.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base font-bold text-snow">{focus.name}</span>
                <PassPill pass={focus.pass} />
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-fog">
                {focus.company} · {focus.id} · scans: {focus.scans}
              </div>
              <div className="mt-2">
                <StatusChip status={focus.status} />
              </div>
            </div>
          </div>

          {(focus.status === "queued" || focus.status === "printing") && (
            <div className="mt-3">
              <div className="flex items-center justify-between font-mono text-[9px] tracking-widest text-fog">
                <span>{focus.status === "queued" ? "AWAITING VENDOR CONSUMER…" : "PRINTING ON PRNT-07…"}</span>
                <span className="text-sun">{focus.activeJobId}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-950">
                <div className="shimmer-bar h-full w-full rounded-full" />
              </div>
              <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-fog-dim">
                “Checked In” is withheld until the webhook confirms the print.
              </p>
            </div>
          )}

          {focus.status === "checked_in" && (
            <div className="pop-in mt-3 flex items-center gap-2 border border-mint/35 bg-mint/8 px-3 py-2">
              <IconCheck className="h-4 w-4 text-mint" />
              <span className="font-mono text-[11px] tracking-wider text-mint">
                CONFIRMED {focus.checkedInAt ? `AT ${fmtStamp(focus.checkedInAt)}` : ""} · {focus.completedJobId}
              </span>
            </div>
          )}

          {focus.status === "failed" && (
            <div className="hazard mt-3 flex items-center justify-between gap-3 border border-rose/40 px-3 py-2">
              <span className="font-mono text-[11px] tracking-wider text-rose">PRINTER JAM — BADGE WITHHELD</span>
              <button
                onClick={() => scan(focus.id)}
                className="inline-flex items-center gap-1.5 border border-rose/50 bg-ink-950/60 px-2.5 py-1 font-mono text-[10px] tracking-widest text-rose transition-colors hover:bg-rose hover:text-ink-950"
              >
                <IconRetry className="h-3.5 w-3.5" /> RETRY
              </button>
            </div>
          )}
        </div>

        <BadgeCard sim={sim} />
      </div>
    </section>
  );
}
