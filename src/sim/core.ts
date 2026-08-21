/* ------------------------------------------------------------------ */
/*  Meridian Pivot Simulation — shared types, seed data and helpers    */
/* ------------------------------------------------------------------ */

export type AttendeeStatus = "expected" | "queued" | "printing" | "checked_in" | "failed";
export type PassType = "Speaker" | "VIP" | "General" | "Press" | "Crew";

export interface Attendee {
  id: string;
  name: string;
  company: string;
  pass: PassType;
  status: AttendeeStatus;
  scans: number;
  activeJobId?: string;
  completedJobId?: string;
  checkedInAt?: number;
}

export type QueueMsgState = "queued" | "processing" | "acked" | "dead";

export interface QueueMsg {
  id: string;
  jobId: string;
  attendeeId: string;
  name: string;
  state: QueueMsgState;
  publishedAt: number;
  pickedAt?: number;
}

export type WebhookResult = "completed" | "failed" | "dropped";

export interface WebhookEvent {
  id: string;
  jobId: string;
  attendeeId: string;
  name: string;
  attempt: number;
  result: WebhookResult;
  arrivedAt: number;
  publishedAt: number;
  outOfOrder: boolean;
  duplicate: boolean;
}

export type LogLevel = "info" | "ok" | "warn" | "err";

export interface LogEntry {
  id: number;
  t: number;
  level: LogLevel;
  text: string;
}

export interface SimStats {
  printed: number;
  dupBlocked: number;
  whReceived: number;
  latSum: number;
  latCount: number;
}

export interface LastScan {
  attendeeId: string;
  outcome: "published" | "dup-inflight" | "dup-done" | "failed-retry";
  at: number;
}

/* ------------------------------ seed ------------------------------ */

export const SEED_ATTENDEES: Attendee[] = [
  { id: "ATT-2201", name: "Priya Nair", company: "Heliox Labs", pass: "Speaker", status: "expected", scans: 0 },
  { id: "ATT-2202", name: "Marcus Webb", company: "Quantable", pass: "General", status: "expected", scans: 0 },
  { id: "ATT-2203", name: "Sana Okabe", company: "Driftline Systems", pass: "VIP", status: "expected", scans: 0 },
  { id: "ATT-2204", name: "Rio Tanaka", company: "Ferrostack", pass: "General", status: "expected", scans: 0 },
  { id: "ATT-2205", name: "Lena Vogel", company: "Wired Circuit Mag", pass: "Press", status: "expected", scans: 0 },
  { id: "ATT-2206", name: "Omar Haddad", company: "Solstice Ops", pass: "Crew", status: "expected", scans: 0 },
];

export const PASS_META: Record<PassType, { chip: string; band: string; label: string }> = {
  Speaker: { chip: "text-sun border-sun/50 bg-sun/10", band: "#FFB224", label: "SPEAKER" },
  VIP: { chip: "text-coral border-coral/50 bg-coral/10", band: "#FF6A45", label: "VIP" },
  General: { chip: "text-teal border-teal/50 bg-teal/10", band: "#3ED6C4", label: "GENERAL" },
  Press: { chip: "text-snow border-fog/50 bg-fog/10", band: "#8CA2C4", label: "PRESS" },
  Crew: { chip: "text-mint border-mint/50 bg-mint/10", band: "#46E5A4", label: "CREW" },
};

export const STATUS_META: Record<
  AttendeeStatus,
  { label: string; cls: string; dot: string }
> = {
  expected: { label: "Expected", cls: "text-fog border-edge bg-ink-800", dot: "bg-fog-dim" },
  queued: { label: "Print queued", cls: "text-sun border-sun/40 bg-sun/10", dot: "bg-sun" },
  printing: { label: "Printing…", cls: "text-sunsoft border-sun/50 bg-sun/15", dot: "bg-sunsoft" },
  checked_in: { label: "Checked In", cls: "text-mint border-mint/45 bg-mint/10", dot: "bg-mint" },
  failed: { label: "Print failed", cls: "text-rose border-rose/45 bg-rose/10", dot: "bg-rose" },
};

/* ----------------------------- helpers ---------------------------- */

export function fmtClock(t: number): string {
  const d = new Date(t);
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function fmtStamp(t: number): string {
  const d = new Date(t);
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

/** Deterministic pseudo-QR matrix from a string id — decorative only. */
export function qrMatrix(seed: string, size = 9): boolean[][] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const grid: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      row.push((h >>> 0) % 100 < 46);
    }
    grid.push(row);
  }
  // finder squares in three corners, like a real QR
  const finder = (cx: number, cy: number) => {
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 3; x++) {
        const edge = x === 0 || y === 0 || x === 2 || y === 2;
        const core = x === 1 && y === 1;
        grid[cy + y][cx + x] = edge || core;
      }
  };
  finder(0, 0);
  finder(size - 3, 0);
  finder(0, size - 3);
  return grid;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
