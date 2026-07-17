import type { SystemScreenCopy } from "@/config/types";
import { GlitchText } from "./glitch-text";
import { SystemNotification } from "./system-notification";

interface SystemScreenProps {
  copy: SystemScreenCopy;
  /** optional action slot rendered between the notification and the footer */
  children?: React.ReactNode;
}

/**
 * Full-viewport System interrupt: glitch headline, notification card,
 * optional action, mono footer. Shared by the device gate, the error
 * boundary and the 404 screen.
 */
export function SystemScreen({ copy, children }: SystemScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <p className="font-heading text-lg tracking-[0.3em] text-destructive">
        <GlitchText text={copy.error} />
      </p>
      <SystemNotification
        heading={copy.heading}
        className="max-w-md animate-flicker"
      >
        <p className="mb-3 font-heading text-sm tracking-[0.2em] text-foreground">
          {copy.title}
        </p>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
      </SystemNotification>
      {children}
      <p className="font-mono text-xs text-muted-foreground">{copy.footer}</p>
    </div>
  );
}
