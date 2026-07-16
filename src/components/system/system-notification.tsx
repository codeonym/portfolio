import { cn } from "@/lib/utils";

interface SystemNotificationProps
  extends React.HTMLAttributes<HTMLDivElement> {
  heading?: string;
}

export function SystemNotification({
  heading = "NOTIFICATION",
  className,
  children,
  ...props
}: SystemNotificationProps) {
  return (
    <div
      className={cn(
        "system-frame animate-pulse-glow rounded-sm px-6 py-5 text-center",
        className,
      )}
      {...props}
    >
      <div className="mb-3 flex items-center justify-center gap-2 font-heading text-sm tracking-[0.35em] text-system text-glow">
        <span aria-hidden>⚠</span>
        {heading}
      </div>
      <div className="text-base leading-relaxed text-foreground/90">
        {children}
      </div>
    </div>
  );
}
