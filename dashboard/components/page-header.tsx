export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header>
      <h1 className="text-2xl font-semibold theme-heading">{title}</h1>
      {children ? <div className="mt-1 text-sm theme-text-muted">{children}</div> : null}
    </header>
  );
}
