"use client";

import { useEffect } from "react";
import { SystemScreen } from "@/components/system/system-screen";
import { Button } from "@/components/ui/button";
import { systemConfig } from "@/config/system.config";

/** Next.js error boundary — catches render/runtime faults below the root layout. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = systemConfig.runtimeError;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SystemScreen copy={copy}>
      <Button onClick={reset} className="font-heading tracking-[0.2em]">
        {copy.retry}
      </Button>
    </SystemScreen>
  );
}
