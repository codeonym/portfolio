import Link from "next/link";
import { SystemScreen } from "@/components/system/system-screen";
import { buttonVariants } from "@/components/ui/button";
import { systemConfig } from "@/config/system.config";
import { cn } from "@/lib/utils";

/** Next.js not-found boundary — any route outside the single-page System. */
export default function NotFound() {
  const copy = systemConfig.notFound;

  return (
    <SystemScreen copy={copy}>
      <Link
        href="/"
        className={cn(buttonVariants(), "font-heading tracking-[0.2em]")}
      >
        {copy.cta}
      </Link>
    </SystemScreen>
  );
}
