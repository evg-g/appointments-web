import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type DivProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...rest }: DivProps) {
  return (
    <div
      className={cn("rounded-lg border border-line bg-surface shadow-sm", className)}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: DivProps) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-0", className)} {...rest} />;
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-semibold text-fg", className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...rest} />;
}

export function CardContent({ className, ...rest }: DivProps) {
  return <div className={cn("p-5", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: DivProps) {
  return <div className={cn("flex items-center gap-3 p-5 pt-0", className)} {...rest} />;
}

/** Convenience wrapper for the common title + description + body shape. */
export function SimpleCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      {(title !== undefined || description !== undefined) && (
        <CardHeader>
          {title !== undefined && <CardTitle>{title}</CardTitle>}
          {description !== undefined && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
