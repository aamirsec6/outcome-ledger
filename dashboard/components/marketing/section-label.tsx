export function SectionLabel({ code }: { code: string }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal-500/90">
      {`// ${code}`}
    </p>
  );
}
