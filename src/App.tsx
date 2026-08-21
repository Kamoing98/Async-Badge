import { StatsBar, TopBar } from "./components/TopBar";
import { Kiosk } from "./components/Kiosk";
import { QueuePanel, WebhookPanel } from "./components/Pipelines";
import { Roster } from "./components/Roster";
import { Logs } from "./components/Logs";
import { ArchFlow, Controls, PivotNotes } from "./components/Bench";
import { Reveal, Scramble } from "./components/bits";
import { useSimulation } from "./sim/useSimulation";

function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div className="grid-lines absolute inset-0" />
      <div
        className="glow-drift absolute -top-40 right-[-10%] h-[560px] w-[720px] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(255,178,36,0.13), transparent 70%)" }}
      />
      <div
        className="glow-drift-slow absolute bottom-[-20%] left-[-12%] h-[520px] w-[640px] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(62,214,196,0.09), transparent 70%)" }}
      />
      <div
        className="glow-drift absolute top-[38%] left-[52%] h-[420px] w-[520px] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(255,106,69,0.06), transparent 70%)", animationDelay: "6s" }}
      />
      <div className="noise-layer absolute inset-0" />
    </div>
  );
}

function Briefing() {
  return (
    <section className="grid gap-5 border-b border-edge-soft pb-6 lg:grid-cols-[1fr_320px] lg:items-end">
      <div>
        <div className="label-caps text-sun">Meridian pivot simulation · client-role handout</div>
        <h1 className="mt-2 font-display text-[26px] font-extrabold leading-[1.08] tracking-tight text-snow sm:text-4xl xl:text-[44px]">
          <Scramble text="NO BADGE WITHOUT" />
          <br />
          <span className="text-sun">
            <Scramble text="A WEBHOOK." />
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-fog">
          Solstice Events&rsquo; badge-printer vendor deprecated the synchronous print API — deadline unchanged. The kiosk
          was rebuilt around the vendor&rsquo;s <span className="text-snow">message queue</span>: scan publishes a{" "}
          <span className="font-mono text-[12px] text-sun">PRINT_REQUEST</span>, the screen holds{" "}
          <span className="text-sun">PENDING</span>, and <span className="text-mint">CHECKED IN</span> appears only when the
          vendor&rsquo;s webhook confirms the badge actually printed. Duplicate scans stay impossible, even when
          confirmations arrive out of order.
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-px border border-edge-soft bg-edge-soft lg:grid-cols-1">
        {[
          ["VENDOR", "BadgeJet · sync REST deprecated"],
          ["MODEL", "queue-publish + webhook callback"],
          ["DEADLINE", "unchanged — shipped anyway"],
        ].map(([k, v]) => (
          <div key={k} className="bg-ink-900 px-3.5 py-2.5">
            <dt className="label-caps !text-[8px]">{k}</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-snow/90">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-edge-soft pt-5">
      <div className="flex flex-col items-start justify-between gap-3 font-mono text-[10px] tracking-wider text-fog-dim sm:flex-row sm:items-center">
        <span>
          PREPARED FOR <span className="text-sun">SOLSTICE EVENTS CO.</span> · MERIDIAN PIVOT SIMULATION
        </span>
        <span>
          kiosk-service v2.1.0-async · dedup key: attendee id · idempotency key: job id · at-least-once ✓
        </span>
      </div>
    </footer>
  );
}

export default function App() {
  const api = useSimulation();
  const { sim } = api;

  return (
    <div className="relative min-h-screen font-body">
      <Background />
      <TopBar />

      <main className="relative z-10 mx-auto max-w-[1460px] space-y-4 px-4 pb-4 pt-6 lg:px-8">
        <Briefing />
        <StatsBar sim={sim} />

        {/* live simulation */}
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <Kiosk sim={sim} scan={api.scan} />
          </div>
          <div className="xl:col-span-4">
            <QueuePanel sim={sim} />
          </div>
          <div className="xl:col-span-4">
            <WebhookPanel sim={sim} onReplay={api.replayLastCallback} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <Roster sim={sim} />
          </div>
          <div className="xl:col-span-5">
            <Logs sim={sim} />
          </div>
        </div>

        {/* the pivot, explained */}
        <Reveal>
          <ArchFlow />
        </Reveal>
        <div className="grid gap-4 xl:grid-cols-12">
          <Reveal className="xl:col-span-4">
            <Controls api={api} />
          </Reveal>
          <Reveal className="xl:col-span-8" delay={120}>
            <PivotNotes />
          </Reveal>
        </div>

        <Footer />
      </main>
    </div>
  );
}
