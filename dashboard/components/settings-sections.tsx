"use client";

import { Bell, Key, ScrollText, Settings2, Users } from "lucide-react";
import { SectionNav } from "@/components/section-nav";

type Props = {
  general: React.ReactNode;
  notifications: React.ReactNode;
  teams: React.ReactNode;
  wins: React.ReactNode;
  developer: React.ReactNode;
  defaultSection?: string;
};

const SECTIONS = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "teams", label: "Teams", icon: Users },
  { id: "wins", label: "Win rules", icon: ScrollText },
  { id: "developer", label: "API & sync", icon: Key },
] as const;

export function SettingsSections({
  general,
  notifications,
  teams,
  wins,
  developer,
  defaultSection,
}: Props) {
  const initial =
    defaultSection && SECTIONS.some((s) => s.id === defaultSection)
      ? defaultSection
      : undefined;

  return (
    <SectionNav
      sections={[...SECTIONS]}
      defaultSection={initial}
      panels={{
        general,
        notifications,
        teams,
        wins,
        developer,
      }}
    />
  );
}
