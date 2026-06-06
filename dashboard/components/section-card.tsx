import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function SectionCard({
  title,
  description,
  children,
  className,
  id,
}: SectionCardProps) {
  return (
    <section id={id} className={cn("theme-panel space-y-4 p-5", className)}>
      <div>
        <h2 className="theme-heading text-base font-medium">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm theme-text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
