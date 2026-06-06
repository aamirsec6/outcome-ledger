import { cn } from "@/lib/cn";

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1600px] px-6 sm:px-10 lg:px-14 xl:px-20",
        className,
      )}
    >
      {children}
    </div>
  );
}
