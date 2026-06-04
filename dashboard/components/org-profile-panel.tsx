"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";

export type OrgProfile = {
  companyName: string;
  legalName?: string;
  tagline?: string;
  stage?: string;
  industry?: string;
  website?: string;
  headquarters?: string;
};

const fields: { key: keyof OrgProfile; label: string; placeholder: string }[] = [
  { key: "companyName", label: "Company / startup name", placeholder: "Acme Robotics" },
  { key: "legalName", label: "Legal entity", placeholder: "Acme Robotics Inc." },
  { key: "tagline", label: "Tagline", placeholder: "AI-native engineering" },
  { key: "stage", label: "Stage", placeholder: "Seed · Series A" },
  { key: "industry", label: "Industry", placeholder: "B2B SaaS · Fintech" },
  { key: "headquarters", label: "HQ / location", placeholder: "San Francisco, CA" },
  { key: "website", label: "Website", placeholder: "https://acme.example" },
];

export function OrgProfilePanel({ initial }: { initial: OrgProfile }) {
  const router = useRouter();
  const [profile, setProfile] = useState<OrgProfile>({
    companyName: initial.companyName || "",
    legalName: initial.legalName || "",
    tagline: initial.tagline || "",
    stage: initial.stage || "",
    industry: initial.industry || "",
    website: initial.website || "",
    headquarters: initial.headquarters || "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (!profile.companyName.trim()) {
      setMessage("Company name required for board pack header.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/org-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(
          data.error || data.detail || (typeof data.detail === "string" ? data.detail : "Save failed"),
        );
        return;
      }
      setMessage("Saved. PDF board pack will use this header.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-teal-400" />
        <div>
          <h2 className="font-medium text-white">Organization profile</h2>
          <p className="text-sm text-slate-400">
            Shown at top of PDF board pack exports (company name, stage, etc.)
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(({ key, label, placeholder }) => (
          <label key={key} className="block text-sm">
            <span className="text-slate-400">{label}</span>
            <input
              type="text"
              value={profile[key] || ""}
              onChange={(e) =>
                setProfile((p) => ({ ...p, [key]: e.target.value }))
              }
              placeholder={placeholder}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save organization profile
      </button>
      {message ? <p className="text-sm text-slate-400">{message}</p> : null}
    </section>
  );
}
