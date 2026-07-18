"use client";

import { Download, ExternalLink } from "lucide-react";
import { player } from "@/config/player.config";
import { sfx } from "@/lib/sfx";

const CV_URL = "/cv.pdf";

/**
 * DOSSIER — the official record. Renders the CV inline; the window
 * ships with a fixed default height (apps.config), so the embed can
 * fill the frame and agents can resize it like any other panel.
 */
export function CvApp() {
  return (
    <div className="flex h-full min-h-[420px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs text-muted-foreground">
          &gt; official record · {player.name} · clearance granted
        </p>
        <span className="flex items-center gap-1.5">
          <a
            href={CV_URL}
            download="bouarour-ayoub-cv.pdf"
            onClick={() => sfx.click()}
            onMouseEnter={() => sfx.hover()}
            className="flex items-center gap-1.5 rounded-sm border border-system/30 bg-system/10 px-2.5 py-1 font-heading text-[10px] tracking-[0.2em] text-system transition hover:-translate-y-0.5 hover:bg-system/20"
          >
            <Download aria-hidden className="size-3" />
            EXTRACT
          </a>
          <a
            href={CV_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sfx.click()}
            onMouseEnter={() => sfx.hover()}
            className="flex items-center gap-1.5 rounded-sm border border-system/15 px-2.5 py-1 font-heading text-[10px] tracking-[0.2em] text-muted-foreground transition hover:-translate-y-0.5 hover:border-system/30 hover:text-foreground"
          >
            <ExternalLink aria-hidden className="size-3" />
            PROJECT
          </a>
        </span>
      </div>

      <div className="system-frame min-h-0 flex-1 overflow-hidden rounded-sm">
        <iframe
          src={`${CV_URL}#view=FitH`}
          title={`${player.name} — curriculum vitae`}
          className="h-full w-full border-0 bg-white/95"
        />
      </div>

      <p className="font-mono text-[10px] text-muted-foreground">
        Viewer blocked the scroll?{" "}
        <a
          href={CV_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-system underline-offset-2 hover:underline"
        >
          open the record in a new tab
        </a>
        .
      </p>
    </div>
  );
}
