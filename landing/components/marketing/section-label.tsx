export function SectionLabel({ code }: { code: string }) {
  return (
    <p className="font-mono-label text-[11px] uppercase tracking-[0.2em] text-emerald-500/80">
      {code}
    </p>
  );
}
