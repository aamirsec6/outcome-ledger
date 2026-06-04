"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { SOLUTION_OPTIONS } from "@/lib/waitlist-news";
import {
  captureUtmFromUrl,
  getOrCreateSessionId,
  getStoredUtm,
  type WaitlistUtm,
} from "@/lib/waitlist-tracking";

const ROLES = [
  "CTO / VP Engineering",
  "Engineering Director",
  "Platform / AI FinOps",
  "CFO / FP&A",
  "Founder",
  "Other",
];

type WaitlistStats = {
  signups: number;
  cap: number;
  spotsRemaining: number;
  percentFull: number;
  isOpen: boolean;
};

type WaitlistFormProps = {
  path?: string;
  compact?: boolean;
  onStats?: (stats: WaitlistStats) => void;
};

export function WaitlistForm({
  path = "/",
  compact = false,
  onStats,
}: WaitlistFormProps) {
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [utm, setUtm] = useState<WaitlistUtm | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [company, setCompany] = useState("");
  const [solutions, setSolutions] = useState<string[]>([]);
  const [otherSolution, setOtherSolution] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error" | "full">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/waitlist/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        onStats?.(data);
      }
    } catch {
      const fallback = {
        signups: 0,
        cap: 50,
        spotsRemaining: 50,
        percentFull: 0,
        isOpen: true,
      };
      setStats(fallback);
      onStats?.(fallback);
    }
  }, [onStats]);

  useEffect(() => {
    setUtm(captureUtmFromUrl());
    refreshStats();
    const captured = captureUtmFromUrl();
    fetch("/api/waitlist/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getOrCreateSessionId(),
        path,
        utmSource: captured.utmSource,
        utmMedium: captured.utmMedium,
        utmCampaign: captured.utmCampaign,
        utmContent: captured.utmContent,
        ref: captured.ref,
        website: "",
      }),
    }).catch(() => {});
  }, [path, refreshStats]);

  const toggleSolution = (id: string) => {
    setSolutions((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    if (solutions.length === 0 && !otherSolution.trim()) {
      setErrorMsg("Pick at least one solution you need (or describe below).");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    const tracking = utm ?? getStoredUtm();
    try {
      const res = await fetch("/api/waitlist/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || null,
          role,
          company: company || null,
          solutions,
          otherSolution: otherSolution || null,
          sessionId: getOrCreateSessionId(),
          utmSource: tracking.utmSource,
          utmMedium: tracking.utmMedium,
          utmCampaign: tracking.utmCampaign,
          utmContent: tracking.utmContent,
          ref: tracking.ref,
          website: honeypot,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setStatus("full");
        if (data.stats) {
          setStats(data.stats);
          onStats?.(data.stats);
        }
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.detail || "Something went wrong. Try again.");
        return;
      }
      setStatus("done");
      if (data.stats) {
        setStats(data.stats);
        onStats?.(data.stats);
      } else refreshStats();
    } catch {
      setStatus("error");
      setErrorMsg("Could not reach the server. Try again in a moment.");
    }
  };

  const spots = stats?.spotsRemaining ?? 50;
  const isOpen = stats?.isOpen ?? true;

  if (status === "done") {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
        <h3 className="mt-4 text-xl font-semibold text-white">You&apos;re on the list</h3>
        <p className="mt-2 text-slate-400">
          Check your inbox. We&apos;ll reach out when your design partner slot opens.
        </p>
        {spots > 0 && (
          <p className="mt-4 text-sm text-teal-300/90">{spots} spots left in this cohort.</p>
        )}
      </div>
    );
  }

  return (
    <>
      {!compact && (
        <>
          <h3 className="text-xl font-semibold text-white">Join the waitlist</h3>
          <p className="mt-1 text-sm text-slate-400">
            Tell us what you need — we prioritize the sharpest pain first.
          </p>
          {!isOpen && (
            <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              Cohort full — join for the next wave.
            </p>
          )}
        </>
      )}

      <form className={cn("space-y-4", !compact && "mt-6")} onSubmit={onSubmit}>
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
        />

        <div>
          <label className="text-xs font-medium text-slate-400">Work email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
          />
        </div>

        {!compact && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-400">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </>
        )}

        <fieldset>
          <legend className="text-xs font-medium text-slate-400">
            What solution do you need? *
          </legend>
          <div className={cn("mt-2 space-y-2", compact && "grid gap-2 sm:grid-cols-2")}>
            {SOLUTION_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition",
                  solutions.includes(opt.id)
                    ? "border-teal-500/60 bg-teal-500/10 text-slate-100"
                    : "border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-600"
                )}
              >
                <input
                  type="checkbox"
                  checked={solutions.includes(opt.id)}
                  onChange={() => toggleSolution(opt.id)}
                  className="mt-1 rounded border-slate-600"
                />
                <span className={compact ? "text-xs" : ""}>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {!compact && (
          <div>
            <label className="text-xs font-medium text-slate-400">Anything else?</label>
            <textarea
              value={otherSolution}
              onChange={(e) => setOtherSolution(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
            />
          </div>
        )}

        {errorMsg && (
          <p className="text-sm text-rose-400" role="alert">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 disabled:opacity-60"
        >
          {status === "loading" ? "Saving…" : "Reserve my spot"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </>
  );
}
