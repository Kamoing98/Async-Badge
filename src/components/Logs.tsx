import { useEffect, useRef } from "react";
import { fmtStamp } from "../sim/core";
import { SimState } from "../sim/useSimulation";

const LEVEL_CLS: Record<string, string> = {
  info: "text-fog",
  ok: "text-mint",
  warn: "text-sun",
  err: "text-rose",
};

const LEVEL_TAG: Record<string, string> = {
  info: "INFO",
  ok: " OK ",
  warn: "WARN",
  err: "FAIL",
};

export function Logs({ sim }: { sim: SimState }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const len = sim.logs.length;

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [len]);

  return (
    <section className="panel flex h-full flex-col overflow-hidden" aria-label="Service log">
      <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
        <div>
          <div className="label-caps">kiosk-service · stdout</div>
          <h2 className="mt-0.5 font-display text-lg font-bold tracking-wide text-snow">
            SERVICE LOG
          </h2>
        </div>
        <span className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-mint">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-mint" />
          STREAMING
        </span>
      </div>
      <div
        ref={boxRef}
        className="scroll-thin h-[280px] flex-1 overflow-y-auto bg-ink-950/70 p-3 font-mono text-[11px] leading-relaxed"
      >
        {sim.logs.map((l) => (
          <div key={l.id} className="msg-in flex gap-2 whitespace-pre-wrap break-words">
            <span className="shrink-0 tabular-nums text-fog-dim">{fmtStamp(l.t)}</span>
            <span className={`shrink-0 font-semibold ${LEVEL_CLS[l.level]}`}>[{LEVEL_TAG[l.level]}]</span>
            <span className={l.level === "info" ? "text-snow/75" : LEVEL_CLS[l.level]}>{l.text}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2 text-teal">
          <span className="text-fog-dim">kiosk@station-04:~$</span>
          <span className="blink inline-block h-3.5 w-2 bg-teal" aria-hidden />
        </div>
      </div>
    </section>
  );
}
