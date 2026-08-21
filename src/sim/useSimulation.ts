import { useCallback, useEffect, useRef, useState } from "react";
import {
  Attendee,
  LastScan,
  LogEntry,
  LogLevel,
  QueueMsg,
  SEED_ATTENDEES,
  SimStats,
  WebhookEvent,
  WebhookResult,
  fmtClock,
} from "./core";

/* ------------------------------------------------------------------ */
/*  Engine state                                                       */
/* ------------------------------------------------------------------ */

export interface DemoState {
  running: boolean;
  step: number;
  steps: string[];
}

export interface SimState {
  attendees: Attendee[];
  queue: QueueMsg[];
  webhooks: WebhookEvent[];
  logs: LogEntry[];
  stats: SimStats;
  lastScan: LastScan | null;
  demo: DemoState | null;
}

interface JobMeta {
  id: string;
  attendeeId: string;
  publishedAt: number;
  done: boolean;
}

const DEMO_STEPS = [
  "Scan Priya Nair — happy path: publish → queue → print → webhook",
  "Re-scan Priya mid-flight — guard must block a second print job",
  "Webhook lands… Priya flips to CHECKED IN only on confirmation",
  "Re-scan Priya after check-in — duplicate blocked, no second badge",
  "Burst-scan Marcus + Sana — confirmations may arrive out of order",
  "Replay Priya's callback — idempotent consumer ignores the duplicate",
  "Scan Rio with a printer jam injected — failure, then a safe retry",
  "Manifest audit — every guard held under the async model",
];

function freshState(): SimState {
  return {
    attendees: SEED_ATTENDEES.map((a) => ({ ...a })),
    queue: [],
    webhooks: [],
    logs: [],
    stats: { printed: 0, dupBlocked: 0, whReceived: 0, latSum: 0, latCount: 0 },
    lastScan: null,
    demo: null,
  };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useSimulation() {
  const simRef = useRef<SimState | null>(null);
  if (!simRef.current) simRef.current = freshState();

  const jobsRef = useRef<Map<string, JobMeta>>(new Map());
  const processedRef = useRef<Set<string>>(new Set());
  const flakyUsedRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const seqRef = useRef(0);
  const jobSeqRef = useRef(0);
  const cancelRef = useRef(false);

  const latencyRef = useRef(2200);
  const flakyRef = useRef(false);
  const jamNextRef = useRef(false);

  const [, setTick] = useState(0);
  const commit = useCallback(() => setTick((t) => t + 1), []);

  const [latencyMs, setLatencyState] = useState(2200);
  const [flaky, setFlakyState] = useState(false);
  const [jamNext, setJamNextState] = useState(false);

  /* ----------------------------- infra ---------------------------- */

  const log = useCallback((level: LogLevel, text: string) => {
    const s = simRef.current!;
    s.logs.push({ id: ++seqRef.current, t: Date.now(), level, text });
    if (s.logs.length > 140) s.logs.splice(0, s.logs.length - 140);
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
      commit();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, [commit]);

  /* ------------------------ vendor pipeline ----------------------- */

  const deliverWebhook = useCallback(
    (jobId: string, attempt: number, result: WebhookResult) => {
      const s = simRef.current!;
      const job = jobsRef.current.get(jobId);
      if (!job) return;
      const att = s.attendees.find((a) => a.id === job.attendeeId);
      if (!att) return;

      s.stats.whReceived++;

      const outOfOrder =
        result === "completed" &&
        !processedRef.current.has(`${jobId}:done`) &&
        [...jobsRef.current.values()].some(
          (o) => o.id !== jobId && o.publishedAt < job.publishedAt && !o.done
        );
      const duplicate =
        result === "completed" && processedRef.current.has(`${jobId}:done`);

      const ev: WebhookEvent = {
        id: `wh_${++seqRef.current}`,
        jobId,
        attendeeId: att.id,
        name: att.name,
        attempt,
        result,
        arrivedAt: Date.now(),
        publishedAt: job.publishedAt,
        outOfOrder,
        duplicate,
      };
      s.webhooks.unshift(ev);
      if (s.webhooks.length > 40) s.webhooks.pop();

      if (result === "dropped") {
        log(
          "warn",
          `webhook delivery FAILED · ${jobId} attempt ${attempt} → 504 gateway timeout · vendor will retry (at-least-once)`
        );
        return;
      }

      if (result === "failed") {
        job.done = true;
        att.status = "failed";
        att.activeJobId = undefined;
        const msg = s.queue.find((m) => m.jobId === jobId);
        if (msg) msg.state = "dead";
        log(
          "err",
          `print FAILED · ${jobId} · ${att.name} — printer jam reported by vendor · screen stays PENDING, "Checked In" withheld`
        );
        return;
      }

      // completed
      if (duplicate) {
        log(
          "warn",
          `duplicate callback · ${jobId} already processed → ignored via idempotency key (no state change, no second badge)`
        );
        return;
      }
      processedRef.current.add(`${jobId}:done`);
      job.done = true;
      att.status = "checked_in";
      att.completedJobId = jobId;
      att.activeJobId = undefined;
      att.checkedInAt = Date.now();
      s.stats.printed++;
      s.stats.latSum += Date.now() - job.publishedAt;
      s.stats.latCount++;
      const msg = s.queue.find((m) => m.jobId === jobId);
      if (msg) msg.state = "acked";
      log(
        "ok",
        `webhook 200 · print.completed · ${jobId} → ${att.name} is CHECKED IN · badge released at ${fmtClock(Date.now())}`
      );
    },
    [log]
  );

  const publishPrintRequest = useCallback(
    (attendeeId: string): LastScan["outcome"] | null => {
      const s = simRef.current!;
      const att = s.attendees.find((a) => a.id === attendeeId);
      if (!att) return null;
      att.scans++;

      /* Guard 1 — already checked in: never print a second badge. */
      if (att.status === "checked_in") {
        s.stats.dupBlocked++;
        log(
          "warn",
          `duplicate scan BLOCKED · ${att.name} already checked in (${att.completedJobId}) · no second badge printed`
        );
        s.lastScan = { attendeeId, outcome: "dup-done", at: Date.now() };
        return "dup-done";
      }

      /* Guard 2 — a job is already in flight for this attendee. */
      if (att.activeJobId) {
        s.stats.dupBlocked++;
        log(
          "warn",
          `duplicate scan BLOCKED · ${att.name} has print job ${att.activeJobId} in flight · dedup key ${att.id} hit, nothing published`
        );
        s.lastScan = { attendeeId, outcome: "dup-inflight", at: Date.now() };
        return "dup-inflight";
      }

      const retrying = att.status === "failed";
      const jobId = `job_${String(++jobSeqRef.current).padStart(3, "0")}`;
      const now = Date.now();
      jobsRef.current.set(jobId, { id: jobId, attendeeId, publishedAt: now, done: false });

      s.queue.unshift({
        id: `msg_${seqRef.current + 1}`,
        jobId,
        attendeeId,
        name: att.name,
        state: "queued",
        publishedAt: now,
      });
      if (s.queue.length > 40) s.queue.pop();

      att.status = "queued";
      att.activeJobId = jobId;
      log(
        "info",
        retrying
          ? `retry after failure · ${att.name} → new PRINT_REQUEST ${jobId} published to vendor queue`
          : `QR verified · ${att.name} (${att.id}) → PRINT_REQUEST ${jobId} published to vendor queue · dedup key: ${att.id}`
      );
      s.lastScan = {
        attendeeId,
        outcome: retrying ? "failed-retry" : "published",
        at: now,
      };

      /* Vendor consumer picks the message up… */
      const pickupIn = 420 + Math.random() * 480;
      schedule(() => {
        const msg = s.queue.find((m) => m.jobId === jobId);
        if (msg && msg.state === "queued") {
          msg.state = "processing";
          msg.pickedAt = Date.now();
        }
        if (att.status === "queued") att.status = "printing";
        log("info", `vendor worker consumed ${jobId} · badge print started on device PRNT-07`);
      }, pickupIn);

      /* …then finishes after the (jittery) print latency. */
      const jitter = 0.7 + Math.random() * 0.6;
      const finishIn = pickupIn + latencyRef.current * jitter;
      schedule(() => {
        if (jamNextRef.current) {
          jamNextRef.current = false;
          setJamNextState(false);
          deliverWebhook(jobId, 1, "failed");
          return;
        }
        if (flakyRef.current && !flakyUsedRef.current.has(jobId)) {
          flakyUsedRef.current.add(jobId);
          deliverWebhook(jobId, 1, "dropped");
          schedule(() => deliverWebhook(jobId, 2, "completed"), 1500 + Math.random() * 800);
          return;
        }
        deliverWebhook(jobId, 1, "completed");
      }, finishIn);

      return retrying ? "failed-retry" : "published";
    },
    [deliverWebhook, log, schedule]
  );

  const scan = useCallback(
    (attendeeId: string) => {
      publishPrintRequest(attendeeId);
      commit();
    },
    [publishPrintRequest, commit]
  );

  const replayLastCallback = useCallback(() => {
    const s = simRef.current!;
    const target = s.webhooks.find((w) => w.result === "completed" && !w.duplicate);
    if (!target) {
      log("info", "replay skipped — no completed callback on record yet");
      commit();
      return;
    }
    log("info", `chaos probe · vendor redelivers callback for ${target.jobId} (attempt ${target.attempt})`);
    deliverWebhook(target.jobId, target.attempt, "completed");
    commit();
  }, [deliverWebhook, log, commit]);

  /* ---------------------------- controls --------------------------- */

  const setLatency = useCallback((ms: number) => {
    latencyRef.current = ms;
    setLatencyState(ms);
  }, []);

  const toggleFlaky = useCallback(() => {
    flakyRef.current = !flakyRef.current;
    setFlakyState(flakyRef.current);
    log(
      flakyRef.current ? "warn" : "info",
      flakyRef.current
        ? "chaos armed · flaky network ON — first delivery of each new job will 504, vendor retries once"
        : "chaos cleared · flaky network OFF"
    );
    commit();
  }, [log, commit]);

  const toggleJam = useCallback(() => {
    jamNextRef.current = !jamNextRef.current;
    setJamNextState(jamNextRef.current);
    log(
      jamNextRef.current ? "warn" : "info",
      jamNextRef.current
        ? "chaos armed · printer jam will hit the NEXT print job"
        : "chaos cleared · printer jam disarmed"
    );
    commit();
  }, [log, commit]);

  const reset = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
    jobsRef.current.clear();
    processedRef.current.clear();
    flakyUsedRef.current.clear();
    jobSeqRef.current = 0;
    cancelRef.current = true;
    jamNextRef.current = false;
    setJamNextState(false);
    simRef.current = freshState();
    log("info", "simulation reset · manifest reloaded · 6 attendees expected");
    commit();
  }, [log, commit]);

  /* --------------------------- guided demo ------------------------- */

  const waitFor = useCallback(
    async (cond: () => boolean, timeoutMs = 25000) => {
      const start = Date.now();
      while (!cond()) {
        if (cancelRef.current || Date.now() - start > timeoutMs) return false;
        await new Promise((r) => setTimeout(r, 140));
      }
      return true;
    },
    []
  );

  const runDemo = useCallback(async () => {
    const s = simRef.current!;
    if (s.demo?.running) return;
    cancelRef.current = false;
    reset();
    await new Promise((r) => setTimeout(r, 350));

    const sim = simRef.current!;
    sim.demo = { running: true, step: 0, steps: DEMO_STEPS };
    commit();
    log("info", "guided test started · exercising every pivot guarantee");

    const setStep = (i: number) => {
      if (simRef.current!.demo) simRef.current!.demo.step = i;
      log("info", `test step ${i + 1}/${DEMO_STEPS.length} · ${DEMO_STEPS[i]}`);
      commit();
    };
    const byId = (id: string) => simRef.current!.attendees.find((a) => a.id === id)!;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const stopped = () => cancelRef.current;

    try {
      setStep(0);
      scan("ATT-2201");
      await sleep(900);
      if (stopped()) return;

      setStep(1);
      scan("ATT-2201"); // must be blocked — job in flight
      await waitFor(() => byId("ATT-2201").status === "checked_in");
      if (stopped()) return;

      setStep(2);
      await sleep(700);
      if (stopped()) return;

      setStep(3);
      scan("ATT-2201"); // must be blocked — already checked in
      await sleep(900);
      if (stopped()) return;

      setStep(4);
      scan("ATT-2202");
      await sleep(260);
      if (stopped()) return;
      scan("ATT-2203");
      await waitFor(
        () => byId("ATT-2202").status === "checked_in" && byId("ATT-2203").status === "checked_in",
        30000
      );
      if (stopped()) return;

      setStep(5);
      await sleep(500);
      replayLastCallback();
      await sleep(900);
      if (stopped()) return;

      setStep(6);
      jamNextRef.current = true;
      setJamNextState(true);
      scan("ATT-2204");
      await waitFor(() => byId("ATT-2204").status === "failed");
      if (stopped()) return;
      await sleep(600);
      if (stopped()) return;
      scan("ATT-2204"); // retry path
      await waitFor(() => byId("ATT-2204").status === "checked_in", 30000);
      if (stopped()) return;

      setStep(7);
      const st = simRef.current!.stats;
      log(
        "ok",
        `guided test complete · ${st.printed} badges issued · ${st.dupBlocked} duplicates blocked · ${st.whReceived} webhooks absorbed`
      );
    } finally {
      if (simRef.current!.demo) simRef.current!.demo.running = false;
      commit();
    }
  }, [commit, log, replayLastCallback, reset, scan, waitFor]);

  const stopDemo = useCallback(() => {
    cancelRef.current = true;
    if (simRef.current!.demo) simRef.current!.demo.running = false;
    log("warn", "guided test stopped by operator");
    commit();
  }, [log, commit]);

  /* ------------------------------ boot ----------------------------- */

  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const s = simRef.current!;
    const boot: Array<[LogLevel, string]> = [
      ["info", "kiosk-service v2.1.0-async booting on STATION-04…"],
      ["info", "rebuilt for the pivot · sync REST print path removed (vendor deprecated it)"],
      ["ok", "connected to vendor queue · amqps://print.solstice.events/queue/print.jobs"],
      ["ok", "webhook endpoint LISTENING · POST /v1/hooks/badge-printer (HMAC-signed)"],
      ["info", "manifest loaded · 6 attendees expected · dedup guard armed on attendee id"],
    ];
    boot.forEach(([lvl, text], i) =>
      s.logs.push({ id: ++seqRef.current, t: Date.now() + i, level: lvl, text })
    );
    commit();
  }, [commit]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  return {
    sim: simRef.current,
    latencyMs,
    flaky,
    jamNext,
    setLatency,
    toggleFlaky,
    toggleJam,
    scan,
    replayLastCallback,
    runDemo,
    stopDemo,
    reset,
  };
}

export type SimActions = ReturnType<typeof useSimulation>;
