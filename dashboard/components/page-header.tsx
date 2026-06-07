/** One-line page context below the shell top bar title. */
export function PageHeader({
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  if (!children) return null;
  return <p className="text-sm theme-text-muted">{children}</p>;
}
