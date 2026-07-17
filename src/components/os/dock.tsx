"use client";

import { appList } from "@/config/apps.config";
import { systemConfig } from "@/config/system.config";
import { sfx } from "@/lib/sfx";
import { topVisibleWindow, useOsStore } from "@/store/os-store";
import { cn } from "@/lib/utils";

export function Dock() {
  const windows = useOsStore((s) => s.windows);
  const open = useOsStore((s) => s.open);
  const topWindowId = topVisibleWindow(windows)?.id;

  return (
    <footer className="z-40 flex items-center justify-between gap-4 border-t border-system/25 bg-background/85 px-5 py-2 backdrop-blur-md">
      <nav aria-label="System applications" className="flex items-center gap-2">
        {appList.map((app, index) => {
          const win = windows.find((w) => w.id === app.id);
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => {
                sfx.open();
                open(app.id);
              }}
              onMouseEnter={() => sfx.hover()}
              className={cn(
                "group relative flex items-center gap-2 rounded-sm border border-transparent px-3 py-1.5 font-heading text-xs tracking-[0.2em] transition hover:-translate-y-0.5",
                win
                  ? "border-system/30 bg-system/10 text-system"
                  : "text-muted-foreground hover:border-system/20 hover:text-foreground",
              )}
            >
              <app.icon
                aria-hidden
                className="size-4"
                strokeWidth={1.75}
              />
              {app.title}
              <kbd
                aria-hidden
                className="rounded-[2px] border border-current/25 px-1 font-mono text-[9px] leading-4 opacity-50"
              >
                {index + 1}
              </kbd>
              <span
                aria-hidden
                className={cn(
                  "absolute -bottom-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full transition",
                  win &&
                    !win.minimized &&
                    (app.id === topWindowId
                      ? "bg-arcane shadow-[0_0_6px_var(--arcane)]"
                      : "bg-system shadow-[0_0_6px_var(--system)]"),
                  win?.minimized && "bg-system/40",
                )}
              />
            </button>
          );
        })}
      </nav>
      <p className="hidden font-mono text-[10px] text-muted-foreground lg:block">
        {systemConfig.dockFooter}
      </p>
    </footer>
  );
}
