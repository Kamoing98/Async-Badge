import { fmtStamp } from "../sim/core";
import { SimState } from "../sim/useSimulation";
import { IconHook, IconQueue } from "./bits";

/* ------------------------------ queue ------------------------------ */

const QUEUE_STATE: Record<string, { label: string; cls: string }> = {
  queued: { label: "QUEUED", cls: "border-sun/50 text-sun bg-sun/10" },
  processing: { label: "CONSUMED", cls: "border-teal/50 text-teal bg-teal/10" },
  acked: { label: "ACKED", cls: "border-mint/40 text-mint bg-mint/10" },
  dead: { label: "DEAD-LETTER", cls: "border-rose/50 text-rose bg-rose/10" },
};

export function QueuePanel({ sim }: { sim: SimState }) {
  const active = sim.queue.filter((m) => m.state === "queued" || m.state === "processing").length;
  return (
    <section className="panel flex h-full flex-col overflow-hidden" aria-label="Vendor message queue">
      <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
        <div>
          <div className="label-caps flex items-center gap-1.5">
            <IconQueue className="h-3.5 w-3.5 text-sun" /> vendor queue · print.jobs
          </div>
          <h2 className="mt-0.5 font-display text-lg font-bold tracking-wide text-snow">
            MESSAGE QUEUE
          </h2>
        </div>
        <span className="border border-edge bg-ink-800 px-2 py-1 font-mono text-[10px] tabular-nums tracking-widest text-fog">
          {active} ACTIVE
        </span>
      </div>

      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 420, minHeight: 260 }}>
        {sim.queue.length === 0 && (
          <div className="grid h-full min-h-[180px] place-items-center border border-dashed border-edge-soft">
            <p className="px-6 text-center font-mono text-[11px] leading-relaxed text-fog-dim">
              queue idle —<br />scan an attendee to publish a PRINT_REQUEST
            </p>
          </div>
        )}
        {sim.queue.map((m) => {
          const st = QUEUE_STATE[m.state];
          const live = m.state === "queued" || m.state === "processing";
          return (
            <article
              key={m.id}
              className={`msg-in border px-3 py-2 transition-opacity duration-500 ${live ? "border-edge bg-ink-800" : "border-edge-soft bg-ink-900/50 opacity-55"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold text-snow">{m.jobId}</span>
                <span className={`border px-1.5 py-0.5 font-mono text-[9px] tracking-widest ${st.cls} ${m.state === "processing" ? "pulse-dot" : ""}`}>
                  {st.label}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-fog">
                <span className="truncate">
                  {m.name} <span className="text-fog-dim">· {m.attendeeId}</span>
                </span>
                <span className="tabular-nums text-fog-dim">{fmtStamp(m.publishedAt)}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ----------------------------- webhooks ---------------------------- */

const RESULT: Record<string, { label: string; cls: string }> = {
  completed: { label: "200 · PRINT.COMPLETED", cls: "border-mint/45 text-mint bg-mint/10" },
  failed: { label: "500 · PRINT.FAILED", cls: "border-rose/50 text-rose bg-rose/10" },
  dropped: { label: "504 · DELIVERY FAILED", cls: "border-sun/50 text-sun bg-sun/10" },
};

export function WebhookPanel({ sim, onReplay }: { sim: SimState; onReplay: () => void }) {
  return (
    <section className="panel flex h-full flex-col overflow-hidden" aria-label="Webhook inbox">
      <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
        <div>
          <div className="label-caps flex items-center gap-1.5">
            <IconHook className="h-3.5 w-3.5 text-teal" /> POST /v1/hooks/badge-printer
          </div>
          <h2 className="mt-0.5 font-display text-lg font-bold tracking-wide text-snow">
            WEBHOOK INBOX
          </h2>
        </div>
        <button
          onClick={onReplay}
          className="border border-teal/45 bg-teal/5 px-2.5 py-1.5 font-mono text-[10px] tracking-widest text-teal transition-all hover:-translate-y-0.5 hover:bg-teal hover:text-ink-950 active:translate-y-0"
          title="Ask the vendor to redeliver the last completed callback — tests idempotency"
        >
          ↻ REPLAY LAST CALLBACK
        </button>
      </div>

      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 420, minHeight: 260 }}>
        {sim.webhooks.length === 0 && (
          <div className="grid h-full min-h-[180px] place-items-center border border-dashed border-edge-soft">
            <p className="px-6 text-center font-mono text-[11px] leading-relaxed text-fog-dim">
              no callbacks yet —<br />the vendor calls us when a badge actually finishes printing
            </p>
          </div>
        )}
        {sim.webhooks.map((w) => {
          const r = RESULT[w.result];
          return (
            <article key={w.id} className="msg-in border border-edge bg-ink-800 px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="border border-teal/50 bg-teal/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-widest text-teal">
                  POST
                </span>
                <span className={`border px-1.5 py-0.5 font-mono text-[9px] tracking-widest ${r.cls}`}>{r.label}</span>
                {w.outOfOrder && (
                  <span className="border border-coral/50 bg-coral/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-coral">
                    OUT-OF-ORDER
                  </span>
                )}
                {w.duplicate && (
                  <span className="border border-fog/40 bg-fog/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-fog">
                    DUPLICATE · IGNORED
                  </span>
                )}
                <span className="ml-auto font-mono text-[9px] tabular-nums text-fog-dim">{fmtStamp(w.arrivedAt)}</span>
              </div>
              <div className="mt-1.5 truncate font-mono text-[10px] text-fog">
                <span className="text-fog-dim">payload</span>{" "}
                {`{"event":"print.${w.result === "dropped" ? "completed" : w.result}","job_id":"${w.jobId}","attendee":"${w.attendeeId}","attempt":${w.attempt}}`}
              </div>
              <div className="mt-1 flex items-center justify-between font-mono text-[10px]">
                <span className="text-snow/90">
                  {w.name} <span className="text-fog-dim">· attempt #{w.attempt}</span>
                </span>
                <span className="text-fog-dim">
                  published {fmtStamp(w.publishedAt).slice(0, 8)} → ack{" "}
                  <span className="text-teal">+{((w.arrivedAt - w.publishedAt) / 1000).toFixed(1)}s</span>
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
