import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Code2,
  Github,
  LineChart,
  MessageCircle,
  Sparkles,
  Terminal,
} from "lucide-react";

export type IntegrationId =
  | "github"
  | "cursor"
  | "openai"
  | "anthropic"
  | "claude-code"
  | "langfuse"
  | "copilot";

export type IntegrationMeta = {
  id: IntegrationId;
  name: string;
  tagline: string;
  icon: LucideIcon;
  accent: string;
  category: "output" | "spend";
};

export const INTEGRATION_CATALOG: IntegrationMeta[] = [
  {
    id: "github",
    name: "GitHub",
    tagline: "Merged PRs & repos",
    icon: Github,
    accent: "var(--text)",
    category: "output",
  },
  {
    id: "cursor",
    name: "Cursor",
    tagline: "IDE billing & AI lines",
    icon: Sparkles,
    accent: "var(--accent)",
    category: "spend",
  },
  {
    id: "openai",
    name: "OpenAI",
    tagline: "API usage spend",
    icon: Bot,
    accent: "#10a37f",
    category: "spend",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    tagline: "Claude API spend",
    icon: MessageCircle,
    accent: "#d97757",
    category: "spend",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    tagline: "CLI usage spend",
    icon: Terminal,
    accent: "#c9a87c",
    category: "spend",
  },
  {
    id: "copilot",
    name: "Copilot",
    tagline: "GitHub Copilot spend",
    icon: Code2,
    accent: "#6e40c9",
    category: "spend",
  },
  {
    id: "langfuse",
    name: "Langfuse",
    tagline: "Observability (soon)",
    icon: LineChart,
    accent: "var(--text-muted)",
    category: "spend",
  },
];

export function catalogForIds(ids: string[]): IntegrationMeta[] {
  const set = new Set(ids);
  return INTEGRATION_CATALOG.filter((c) => set.has(c.id));
}
