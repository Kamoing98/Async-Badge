import { ReactNode, useEffect, useRef, useState } from "react";
import { PASS_META, PassType, STATUS_META, AttendeeStatus, qrMatrix } from "../sim/core";

/* ------------------------- prefers-reduced ------------------------- */

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

/* --------------------------- scramble text ------------------------- */

const GLYPHS = "▓▒░<>/\\|#*+=~";

export function Scramble({ text, className }: { text: string; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [out, setOut] = useState(reduced ? text : "");
  const frame = useRef(0);

  useEffect(() => {
    if (reduced) {
      setOut(text);
      return;
    }
    frame.current = 0;
    const id = setInterval(() => {
      frame.current++;
      const solved = Math.floor(frame.current / 2);
      const next = text
        .split("")
        .map((ch, i) => {
          if (ch === " ") return " ";
          if (i < solved) return ch;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");
      setOut(next);
      if (solved >= text.length) clearInterval(id);
    }, 38);
    return () => clearInterval(id);
  }, [text, reduced]);

  return (
    <span className={className} aria-label={text}>
      {out || "\u00A0"}
    </span>
  );
}

/* ---------------------------- reveal ------------------------------- */

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("is-in");
            io.disconnect();
          }
        });
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ----------------------------- mini QR ------------------------------ */

export function MiniQR({ seed, size = 40, className = "" }: { seed: string; size?: number; className?: string }) {
  const grid = qrMatrix(seed);
  const n = grid.length;
  const cell = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden>
      <rect width={size} height={size} fill="currentColor" opacity={0.08} rx={2} />
      {grid.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell * 0.92} height={cell * 0.92} fill="currentColor" />
          ) : null
        )
      )}
    </svg>
  );
}

/* ------------------------------ chips ------------------------------- */

export function PassPill({ pass }: { pass: PassType }) {
  const m = PASS_META[pass];
  return (
    <span className={`inline-flex items-center border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] ${m.chip}`}>
      {m.label}
    </span>
  );
}

export function StatusChip({ status, pulse = true }: { status: AttendeeStatus; pulse?: boolean }) {
  const m = STATUS_META[status];
  const live = status === "queued" || status === "printing";
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] tracking-wider ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot} ${live && pulse ? "pulse-dot" : ""}`} />
      {m.label}
    </span>
  );
}

/* ------------------------------ icons ------------------------------- */

const ic = "inline-block shrink-0";

export function IconSun({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${className}`} aria-hidden>
      <path d="M5 16a7 7 0 0 1 14 0z" fill="currentColor" />
      <path d="M3 19h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 4v2.5M5.6 6.6l1.8 1.8M18.4 6.6l-1.8 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconScan({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`${ic} ${className}`} aria-hidden>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" strokeLinecap="round" />
      <path d="M4 12h16" strokeLinecap="round" strokeDasharray="3 2.4" />
    </svg>
  );
}

export function IconQueue({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`${ic} ${className}`} aria-hidden>
      <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
      <path d="m17 9 3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconHook({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`${ic} ${className}`} aria-hidden>
      <path d="M12 3v9a4 4 0 1 1-4-4" strokeLinecap="round" />
      <circle cx="12" cy="3.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="m18 14 3 3-3 3M21 17h-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCheck({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${ic} ${className}`} aria-hidden>
      <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8 12 2.8 2.8L16.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBolt({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${ic} ${className}`} aria-hidden>
      <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5z" />
    </svg>
  );
}

export function IconRetry({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`${ic} ${className}`} aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" strokeLinecap="round" />
      <path d="M20 3v4h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
