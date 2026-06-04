"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
        Something went wrong
      </h1>
      <p className="text-sm theme-text-muted">
        The dashboard hit an error. If the API was just updated, restart the API
        service so database migrations can run, then refresh.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-accent-dim px-4 py-2 text-sm font-medium theme-accent"
      >
        Try again
      </button>
    </div>
  );
}
