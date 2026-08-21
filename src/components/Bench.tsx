import { SimActions } from "../sim/useSimulation";
import { IconBolt, IconCheck, IconHook, IconQueue, IconRetry, IconScan, Scramble } from "./bits";

/* ----------------------------- controls ---------------------------- */

export function Controls({ api }: { api: SimActions }) {
  const { sim, latencyMs, flaky, jamNext } = api;
  const demo = sim.demo;
  const pct = ((latencyMs - 600) / (5000 - 600)) * 100;

  return (
    <section className="panel flex h-full flex-col p-4" aria-label="Test bench controls">
      <div className="label-caps flex items-center gap-1.5">
        <IconBolt className="h-3.5 w-3.5 text-sun" /> test bench · chaos & scenario
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label htmlFor="latency" className="font-mono text-[11px] tracking-wider text-fog">
            VENDOR PRINT LATENCY
          </label>
          <span className="font-display text-sm font-bold tabular-nums text-sun">{(latencyMs / 1000).toFixed(1)}s</span>
        </div>
        <input
          id="latency"
          type="range"
          min={600}
          max={5000}
          step={100}
          value={latencyMs}
          onChange={(e) => api.setLatency(Number(e.target.value))}
          className="sun-range mt-2 w-full"
          style={{ ["--fill" as string]: `${pct}%` }}
        />
        <div className="mt-1 flex justify-between font-mono text-[9px] text-fog-dim">
          <span>0.6s · snappy</span>
          <span>5.0s · conference-day awful</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={api.toggleFlaky}
          aria-pressed={flaky}
          className={`border px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 active:translate-y-0 ${
            flaky ? "border-sun/60 bg-sun/15" : "border-edge bg-ink-800 hover:border-edge"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-mono text-[10px] tracking-widest ${flaky ? "text-sun" : "text-fog"}`}>FLAKY NETWORK</span>
            <span className={`h-2 w-2 rounded-full ${flaky ? "pulse-dot bg-sun" : "bg-fog-dim"}`} />
          </div>
          <div className="mt-1 text-[10px] leading-snug text-fog-dim">1st webhook 504s · vendor retries once</div>
        </button>
        <button
          onClick={api.toggleJam}
          aria-pressed={jamNext}
          className={`border px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 active:translate-y-0 ${
            jamNext ? "border-rose/60 bg-rose/15" : "border-edge bg-ink-800 hover:border-edge"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-mono text-[10px] tracking-widest ${jamNext ? "text-rose" : "text-fog"}`}>JAM NEXT JOB</span>
            <span className={`h-2 w-2 rounded-full ${jamNext ? "pulse-dot bg-rose" : "bg-fog-dim"}`} />
          </div>
          <div className="mt-1 text-[10px] leading-snug text-fog-dim">printer fails · failure path + retry</div>
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        {demo?.running ? (
          <button
            onClick={api.stopDemo}
            className="flex-1 border border-rose/60 bg-rose/15 px-3 py-2.5 font-mono text-[11px] tracking-widest text-rose transition-colors hover:bg-rose hover:text-ink-950"
          >
            ■ STOP TEST
          </button>
        ) : (
          <button
            onClick={api.runDemo}
            className="group flex flex-1 items-center justify-center gap-2 border border-sun/60 bg-sun px-3 py-2.5 font-mono text-[11px] font-semibold tracking-widest text-ink-950 transition-all hover:-translate-y-0.5 hover:bg-sunsoft active:translate-y-0"
          >
            <IconScan className="h-4 w-4 transition-transform group-hover:scale-110" />
            RUN GUIDED TEST · 8 STEPS
          </button>
        )}
        <button
          onClick={api.reset}
          className="border border-edge bg-ink-800 px-3 py-2.5 font-mono text-[11px] tracking-widest text-fog transition-colors hover:border-fog hover:text-snow"
        >
          <IconRetry className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* demo steps */}
      <ol className="mt-4 space-y-1.5 border-t border-edge-soft pt-3">
        {(demo?.steps ?? []).map((step, i) => {
          const running = demo?.running;
          const state = !demo
            ? "idle"
            : running
            ? i < demo.step
              ? "done"
              : i === demo.step
              ? "live"
              : "todo"
            : i <= demo.step
            ? "done"
            : "todo";
          return (
            <li
              key={i}
              className={`flex items-start gap-2 font-mono text-[10px] leading-snug transition-colors duration-300 ${
                running && state === "live"
                  ? "text-sun"
                  : state === "done" && !running
                  ? "text-fog"
                  : "text-fog-dim"
              }`}
            >
              <span
                className={`mt-[1px] grid h-4 w-4 shrink-0 place-items-center border text-[9px] ${
                  running && state === "live"
                    ? "border-sun bg-sun/20 text-sun"
                    : state === "done" && !running
                    ? "border-mint/50 text-mint"
                    : "border-edge text-fog-dim"
                }`}
              >
                {state === "done" && !running ? "✓" : i + 1}
              </span>
              <span className={running && state === "live" ? "font-semibold" : ""}>{step}</span>
            </li>
          );
        })}
        {!demo && (
          <li className="font-mono text-[10px] text-fog-dim">
            — the guided test proves all three client requirements: 3+ attendees, the duplicate-scan case, and async confirmation.
          </li>
        )}
      </ol>
    </section>
  );
}

/* --------------------------- architecture -------------------------- */

function FlowLink({ tone = "sun", label, num }: { tone?: "sun" | "teal"; label: string; num: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 self-center px-1">
      <span className="font-mono text-[9px] tracking-wider text-fog-dim">
        <span className={tone === "sun" ? "text-sun" : "text-teal"}>{num}</span> {label}
      </span>
      <div className={`relative h-[2px] w-full ${tone === "sun" ? "flow-dash" : "flow-dash-teal"}`}>
        <span
          className="dot-travel h-1.5 w-1.5 rounded-full"
          style={{ background: tone === "sun" ? "var(--color-sun)" : "var(--color-teal)", boxShadow: `0 0 8px ${tone === "sun" ? "var(--color-sun)" : "var(--color-teal)"}` }}
        />
      </div>
    </div>
  );
}

function Node({ title, sub, tone }: { title: string; sub: string; tone: string }) {
  return (
    <div className="w-[128px] shrink-0 border border-edge bg-ink-800 px-3 py-2.5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-fog sm:w-[150px]">
      <div className="font-display text-[11px] font-bold tracking-wide" style={{ color: tone }}>
        {title}
      </div>
      <div className="mt-1 break-words font-mono text-[8px] leading-snug text-fog-dim">{sub}</div>
    </div>
  );
}

export function ArchFlow() {
  return (
    <section className="panel p-5" aria-label="Async architecture">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="label-caps">kiosk-service v2.1.0-async · topology</div>
          <h2 className="mt-1 font-display text-xl font-bold tracking-wide text-snow sm:text-2xl">
            <Scramble text="HOW THE PIVOT FLOWS" />
          </h2>
        </div>
        <span className="font-mono text-[10px] tracking-widest text-fog-dim">
          AT-LEAST-ONCE DELIVERY · IDEMPOTENT CONSUMER · DEDUP ON ATTENDEE ID
        </span>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div className="flex min-w-[760px] items-center gap-2">
          <Node title="KIOSK UI" sub="scan → show PENDING, never Checked In early" tone="#3ED6C4" />
          <FlowLink num="①" label="scan verified" />
          <Node title="KIOSK SERVICE" sub="publish + dedup guard on attendee id" tone="#FFB224" />
          <FlowLink num="②" label="PRINT_REQUEST" />
          <div className="w-[150px] shrink-0 border border-sun/50 bg-sun/8 px-3 py-2.5 text-center transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-center gap-1.5 font-display text-[11px] font-bold tracking-wide text-sun">
              <IconQueue className="h-3.5 w-3.5" /> VENDOR QUEUE
            </div>
            <div className="mt-1 font-mono text-[8px] leading-snug text-fog-dim">print.jobs · durable · ordered-per-key</div>
          </div>
          <FlowLink num="③" label="consume + print" />
          <Node title="PRINT WORKER" sub="vendor side · owns the hardware" tone="#FF6A45" />
        </div>

        <div className="mt-3 flex min-w-[760px] items-center gap-2 pl-[136px] sm:pl-[158px]">
          <div className="flex flex-1 flex-col items-center gap-1">
            <div className="relative h-[2px] w-full flow-dash-teal">
              <span
                className="dot-travel h-1.5 w-1.5 rounded-full bg-teal"
                style={{ boxShadow: "0 0 8px var(--color-teal)", animationDelay: "0.6s" }}
              />
            </div>
            <span className="font-mono text-[9px] tracking-wider text-fog-dim">
              <span className="text-teal">④</span> print.completed / print.failed · POST to our webhook (retried on 5xx — at-least-once)
            </span>
          </div>
          <div className="w-[150px] shrink-0 border border-teal/50 bg-teal/8 px-3 py-2.5 text-center transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-center gap-1.5 font-display text-[11px] font-bold tracking-wide text-teal">
              <IconHook className="h-3.5 w-3.5" /> WEBHOOK
            </div>
            <div className="mt-1 font-mono text-[8px] leading-snug text-fog-dim">/v1/hooks/badge-printer · HMAC-verified</div>
          </div>
        </div>
      </div>

      <p className="mt-4 border-t border-edge-soft pt-3 font-mono text-[10px] leading-relaxed text-fog-dim">
        <span className="text-sun">①–②</span> the kiosk publishes and immediately renders{" "}
        <span className="text-sun">PENDING</span> · <span className="text-teal">③–④</span> the UI flips to{" "}
        <span className="text-mint">CHECKED IN</span> only when the webhook lands — and because the consumer is idempotent,
        retried, replayed or out-of-order callbacks can never mint a second badge.
      </p>
    </section>
  );
}

/* ---------------------------- pivot notes -------------------------- */

const BEFORE = [
  "POST /v1/print → block the kiosk thread, wait for 200 OK",
  "“Checked In” painted the instant the button was pressed",
  "Timeout = unknown badge state; staff re-scan → double print",
  "One slow printer stalls the entire check-in line",
  "No replay story: vendor retries were our problem to fear",
];

const AFTER = [
  "Publish PRINT_REQUEST to the vendor queue → respond instantly",
  "UI renders PENDING; CHECKED IN only on webhook confirmation",
  "Dedup guard on attendee id blocks re-scans before publish",
  "Printer speed is the vendor's problem; line keeps moving",
  "Idempotent webhook consumer: replays & out-of-order are safe",
];

const GUARANTEES = [
  ["3+ test attendees proven", "Priya, Marcus, Sana and Rio all exercised end-to-end by the guided test."],
  ["Duplicate scan → zero extra badges", "Blocked twice: mid-flight (job in queue) and post-confirmation (already checked in)."],
  ["Out-of-order confirmations safe", "State transitions are keyed per job; an early ack can never un-check-in anyone."],
  ["At-least-once delivery absorbed", "504 → vendor retry → idempotency key swallows the duplicate callback."],
];

export function PivotNotes() {
  return (
    <section className="panel flex h-full flex-col p-5" aria-label="What changed in the pivot">
      <div className="label-caps">client brief · solstice events co.</div>
      <h2 className="mt-1 font-display text-xl font-bold tracking-wide text-snow sm:text-2xl">
        <Scramble text="WHAT CHANGED IN THE PIVOT" />
      </h2>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="border border-rose/25 bg-rose/[0.04] p-3.5">
          <div className="font-mono text-[10px] tracking-[0.2em] text-rose">v1 · SYNC REST — DEPRECATED BY VENDOR</div>
          <ul className="mt-2.5 space-y-2">
            {BEFORE.map((b) => (
              <li key={b} className="flex gap-2 text-[12px] leading-snug text-fog">
                <span className="font-mono font-semibold text-rose">−</span>
                <span className="line-through decoration-rose/40 decoration-1">{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-mint/25 bg-mint/[0.04] p-3.5">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mint">v2 · QUEUE + WEBHOOK — SHIPPED</div>
          <ul className="mt-2.5 space-y-2">
            {AFTER.map((a) => (
              <li key={a} className="flex gap-2 text-[12px] leading-snug text-snow/85">
                <span className="font-mono font-semibold text-mint">+</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 border-t border-edge-soft pt-4">
        <div className="label-caps mb-2.5">guarantees the client asked for</div>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {GUARANTEES.map(([t, d]) => (
            <li key={t} className="group flex gap-2.5 border border-edge-soft bg-ink-800/60 p-3 transition-colors hover:border-mint/40">
              <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint transition-transform group-hover:scale-110" />
              <div>
                <div className="text-[12px] font-semibold text-snow">{t}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-fog-dim">{d}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
