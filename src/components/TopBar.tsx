import { useEffect, useState } from "react";
import { fmtClock } from "../sim/core";
import { SimState } from "../sim/useSimulation";
import { IconSun, Scramble } from "./bits";

function LiveClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-sm tabular-nums text-snow">{fmtClock(now)}</span>;
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-edge-soft bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1460px] items-center gap-4 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center border border-sun/40 bg-sun/10 text-sun">
            <IconSun className="h-6 w-6" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-bold tracking-wide text-snow">
              SOLSTICE <span className="text-sun">&rsquo;26</span>
            </div>
            <div className="label-caps !text-[9px]">Meridian Pivot · Check-In Kiosk</div>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center gap-3 md:flex">
          <span className="inline-flex items-center gap-2 border border-mint/30 bg-mint/5 px-3 py-1.5 font-mono text-[10px] tracking-widest text-mint">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-mint" />
            QUEUE · CONNECTED
          </span>
          <span className="inline-flex items-center gap-2 border border-sun/30 bg-sun/5 px-3 py-1.5 font-mono text-[10px] tracking-widest text-sun">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-sun" />
            WEBHOOK · LISTENING /v1/hooks/badge-printer
          </span>
        </div>

        <div className="ml-auto flex items-center gap-4 md:ml-0">
          <div className="hidden text-right leading-tight sm:block">
            <div className="label-caps !text-[9px]">Day 2 · Hall C</div>
            <LiveClock />
          </div>
          <div className="hidden border border-edge bg-ink-800 px-2.5 py-1.5 lg:block">
            <Scramble text="STATION 04" className="font-mono text-[11px] tracking-[0.25em] text-teal" />
          </div>
        </div>
      </div>
    </header>
  );
}

export function StatsBar({ sim }: { sim: SimState }) {
  const { stats, attendees } = sim;
  const avg =
    stats.latCount > 0 ? `${(stats.latSum / stats.latCount / 1000).toFixed(2)}s` : "—";
  const inFlight = attendees.filter((a) => a.status === "queued" || a.status === "printing").length;

  const items: Array<{ label: string; value: string; tone: string; sub: string }> = [
    { label: "Badges printed", value: String(stats.printed), tone: "text-mint", sub: "webhook-confirmed only" },
    { label: "Duplicates blocked", value: String(stats.dupBlocked), tone: "text-sun", sub: "dedup guard on attendee id" },
    { label: "Avg confirm latency", value: avg, tone: "text-teal", sub: "publish → webhook 200" },
    { label: "Webhooks received", value: String(stats.whReceived), tone: "text-coral", sub: `${inFlight} job${inFlight === 1 ? "" : "s"} in flight` },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Live service metrics">
      {items.map((it, i) => (
        <div
          key={it.label}
          className="panel rise-in relative overflow-hidden px-4 py-3 transition-colors duration-300 hover:border-edge"
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <div className="absolute inset-y-0 left-0 w-[3px] bg-current opacity-70" style={{ color: "var(--color-edge)" }} />
          <div className="label-caps">{it.label}</div>
          <div className={`mt-1 font-display text-2xl font-bold tabular-nums lg:text-3xl ${it.tone}`}>{it.value}</div>
          <div className="mt-0.5 font-mono text-[10px] text-fog-dim">{it.sub}</div>
        </div>
      ))}
    </section>
  );
}
