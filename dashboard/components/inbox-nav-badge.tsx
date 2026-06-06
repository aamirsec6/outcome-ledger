"use client";

import { useEffect, useState } from "react";

export function InboxNavBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/attribution/inbox", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setCount(Number(data.pendingCount) || 0);
      } catch {
        /* ignore */
      }
    }
    void load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span
      className="ml-auto rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
      title="Attribution items need review"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
