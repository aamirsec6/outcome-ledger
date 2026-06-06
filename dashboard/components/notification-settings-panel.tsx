"use client";

import { useState } from "react";
import { Bell, Loader2, Mail, MessageSquare, Github } from "lucide-react";

export type NotificationSettings = {
  slackWebhookUrl: string;
  slackAlertsEnabled: boolean;
  slackWebhookConfigured?: boolean;
  digestEmails: string[];
  digestEnabled: boolean;
  monthlyBudgetUsd: number;
  budgetAlertThresholdPct: number;
  githubPrCommentsEnabled: boolean;
  alertOnCpstSpike: boolean;
  alertOnBudgetBurn: boolean;
  alertOnInbox: boolean;
};

export function NotificationSettingsPanel({ initial }: { initial: NotificationSettings }) {
  const [settings, setSettings] = useState<NotificationSettings>({
    ...initial,
    digestEmails: initial.digestEmails ?? [],
  });
  const [digestInput, setDigestInput] = useState((initial.digestEmails ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState<"slack" | "digest" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function toggle(key: keyof NotificationSettings) {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    const emails = digestInput
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, digestEmails: emails }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || data.detail || "Save failed");
        return;
      }
      setSettings(data.settings ?? settings);
      setMessage("Saved. Alerts fire after each sync; digest runs Mondays via cron.");
    } finally {
      setBusy(false);
    }
  }

  async function testSlack() {
    setTestBusy("slack");
    setMessage(null);
    try {
      await save();
      const res = await fetch("/api/notifications/test-slack", { method: "POST" });
      const data = await res.json();
      setMessage(res.ok ? "Test message sent to Slack." : data.error || "Slack test failed");
    } finally {
      setTestBusy(null);
    }
  }

  async function testDigest() {
    setTestBusy("digest");
    setMessage(null);
    try {
      await save();
      const res = await fetch("/api/notifications/test-digest", { method: "POST" });
      const data = await res.json();
      setMessage(res.ok ? "Test digest emailed." : data.error || "Digest test failed");
    } finally {
      setTestBusy(null);
    }
  }

  return (
    <section className="theme-panel space-y-5 p-5">
      <div className="flex items-center gap-3">
        <Bell className="theme-icon h-6 w-6 shrink-0" />
        <div>
          <h2 className="theme-heading text-base font-medium">Alerts & digest</h2>
          <p className="text-sm theme-text-muted">
            Slack alerts after sync, weekly email digest, GitHub PR cost comments, attribution inbox pings.
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t border-[var(--border)] pt-4">
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text)" }}>
          <MessageSquare className="h-4 w-4" />
          Slack alerts
        </div>
        <label className="block text-sm">
          <span className="theme-text-muted">Incoming webhook URL</span>
          <input
            type="url"
            className="theme-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
            placeholder="https://hooks.slack.com/services/..."
            value={settings.slackWebhookUrl}
            onChange={(e) => setSettings((s) => ({ ...s, slackWebhookUrl: e.target.value }))}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.slackAlertsEnabled}
            onChange={() => toggle("slackAlertsEnabled")}
          />
          Send Slack alerts after sync (CPST spikes, budget burn, inbox)
        </label>
        <div className="flex flex-wrap gap-2 pl-6 text-xs theme-text-muted">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={settings.alertOnCpstSpike} onChange={() => toggle("alertOnCpstSpike")} />
            CPST spikes
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={settings.alertOnBudgetBurn} onChange={() => toggle("alertOnBudgetBurn")} />
            Budget burn
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={settings.alertOnInbox} onChange={() => toggle("alertOnInbox")} />
            Inbox items
          </label>
        </div>
        <button
          type="button"
          onClick={testSlack}
          disabled={testBusy !== null || !settings.slackWebhookUrl}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs theme-text-muted hover:theme-text"
        >
          {testBusy === "slack" ? "Sending…" : "Send test to Slack"}
        </button>
      </div>

      <div className="space-y-4 border-t border-[var(--border)] pt-4">
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text)" }}>
          <Mail className="h-4 w-4" />
          Weekly digest (Mondays)
        </div>
        <label className="block text-sm">
          <span className="theme-text-muted">Email recipients (comma-separated)</span>
          <input
            type="text"
            className="theme-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
            placeholder="cto@company.com, finops@company.com"
            value={digestInput}
            onChange={(e) => setDigestInput(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.digestEnabled} onChange={() => toggle("digestEnabled")} />
          Enable Monday digest email
        </label>
        <button
          type="button"
          onClick={testDigest}
          disabled={testBusy !== null || !digestInput.trim()}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs theme-text-muted hover:theme-text"
        >
          {testBusy === "digest" ? "Sending…" : "Send test digest now"}
        </button>
      </div>

      <div className="space-y-4 border-t border-[var(--border)] pt-4">
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text)" }}>
          Budget guardrail
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="theme-text-muted">Monthly AI budget (USD)</span>
            <input
              type="number"
              min={0}
              className="theme-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
              value={settings.monthlyBudgetUsd || ""}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  monthlyBudgetUsd: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="theme-text-muted">Alert when used % reaches</span>
            <input
              type="number"
              min={1}
              max={100}
              className="theme-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
              value={settings.budgetAlertThresholdPct}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  budgetAlertThresholdPct: parseFloat(e.target.value) || 80,
                }))
              }
            />
          </label>
        </div>
      </div>

      <div className="space-y-3 border-t border-[var(--border)] pt-4">
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text)" }}>
          <Github className="h-4 w-4" />
          GitHub PR comments
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.githubPrCommentsEnabled}
            onChange={() => toggle("githubPrCommentsEnabled")}
          />
          Post attributed AI cost on merged PRs (requires GitHub connected)
        </label>
      </div>

      {message ? <p className="text-sm theme-text-muted">{message}</p> : null}

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="theme-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save notification settings
      </button>
    </section>
  );
}
