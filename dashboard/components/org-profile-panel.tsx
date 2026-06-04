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

const fields: { key: keyof OrgProfile; label: string; placeholder: string; fullWidth?: boolean }[] = [
  { key: "companyName", label: "Company / startup name", placeholder: "Acme Robotics" },
  { key: "legalName", label: "Legal entity", placeholder: "Acme Robotics Inc." },
  { key: "tagline", label: "Tagline", placeholder: "AI-native engineering" },
  { key: "stage", label: "Stage", placeholder: "Seed · Series A" },
  { key: "industry", label: "Industry", placeholder: "B2B SaaS · Fintech" },
  { key: "headquarters", label: "HQ / location", placeholder: "San Francisco, CA" },
  { key: "website", label: "Website", placeholder: "https://acme.example", fullWidth: true },
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
        setMessage(data.error || data.detail || "Save failed");
        return;
      }
      setMessage("Saved. PDF board pack will use this header.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="theme-panel space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Building2 className="theme-icon h-6 w-6 shrink-0" />
        <div>
          <h2 className="theme-heading text-base font-medium">Organization profile</h2>
          <p className="text-sm theme-text-muted">
            Shown at top of PDF board pack exports (company name, stage, etc.)
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(({ key, label, placeholder, fullWidth }) => (
          <label
            key={key}
            className={`theme-label ${fullWidth ? "sm:col-span-2" : ""}`}
          >
            {label}
            <input
              type="text"
              value={profile[key] || ""}
              onChange={(e) =>
                setProfile((p) => ({ ...p, [key]: e.target.value }))
              }
              placeholder={placeholder}
              className="theme-input"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="theme-btn-primary"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save organization profile
      </button>
      {message ? <p className="theme-message">{message}</p> : null}
    </section>
  );
}
