import { cn } from "@/lib/utils";

interface GlitchTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
}

/** Text with RGB-split glitch slices (pure CSS, disabled under reduced motion). */
export function GlitchText({ text, className, ...props }: GlitchTextProps) {
  return (
    <span className={cn("glitch", className)} data-text={text} {...props}>
      {text}
    </span>
  );
}
