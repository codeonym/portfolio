"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronUp, CornerDownLeft, Square, X } from "lucide-react";
import { useAgent, useCopilotKit, useRenderToolCall } from "@copilotkit/react-core/v2";
import type { Message, ToolCall } from "@ag-ui/client";
import { SYSTEM_AGENT_ID } from "@/agent/constants";
import { findItem } from "@/config/inventory.config";
import { quests } from "@/config/quests.config";
import { findSkill } from "@/config/skills.config";
import { isZoneId, world, zoneById } from "@/config/world.config";
import { chime, play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { live, useWorldStore } from "@/store/world-store";
import { Markdown } from "./markdown";
import { useLinkStatus } from "./link-status";
import { PRESENTATION_TOOLS } from "./system-tools";

const copy = world.agent;

type ToolMessage = Extract<Message, { role: "tool" }>;

function parseArgs(call: ToolCall): Record<string, unknown> {
  try {
    return JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** one-line, in-world caption for a world command the System executed */
function actionLabel(call: ToolCall): string {
  const a = parseArgs(call);
  const zone = typeof a.zone === "string" && isZoneId(a.zone) ? zoneById[a.zone] : null;
  const id = typeof a.id === "string" ? a.id : "";
  switch (call.function.name) {
    case "open_zone":
      return zone ? `WINDOW OPENED · ${zone.section}` : "WINDOW OPENED";
    case "walk_to_zone":
      return zone ? `WALKING TO · ${zone.name}` : "WALKING";
    case "close_windows":
      return "WINDOWS CLOSED";
    case "inspect_entity": {
      const name = a.kind === "skill" ? findSkill(id)?.name : a.kind === "item" ? findItem(id)?.name : quests.find((q) => q.id === id)?.name;
      return `INSPECTING · ${name ?? id}`;
    }
    case "arise":
      return `ARISE · ${quests.find((q) => q.id === id)?.name ?? "the next fallen"}`;
    case "open_cv":
      return "HUNTER'S LICENSE PROJECTED";
    case "toggle_map":
      return a.open ? "WORLD MAP OPENED" : "WORLD MAP CLOSED";
    case "set_sound":
      return a.muted ? "SOUND MUTED" : "SOUND ON";
    case "set_quality":
      return `GRAPHICS · ${String(a.quality ?? "").toUpperCase()}`;
    case "system_notification":
      return `NOTICE · ${String(a.heading ?? "")}`;
    case "cast_effect":
      return `EFFECT · ${String(a.effect ?? "").toUpperCase()}`;
    case "visitor_progress":
      return "READING YOUR PROGRESS";
    case "consult_archive":
      return `ARCHIVE · ${String(a.section ?? "").toUpperCase()}`;
    default:
      return call.function.name.replace(/_/g, " ").toUpperCase();
  }
}

function ActionChip({ call, done }: { call: ToolCall; done: boolean }) {
  return (
    <div className="flex items-center gap-2 font-display text-[9px] tracking-[0.22em] text-system/90">
      <span className={cn("size-1.5 rotate-45 bg-system", !done && "animate-pulse")} />
      <span className="truncate">[ {actionLabel(call)} ]</span>
    </div>
  );
}

function textOf(m: Message): string {
  const c = (m as { content?: unknown }).content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text) : "")).join("");
  return "";
}

function Thread({ messages, running }: { messages: Message[]; running: boolean }) {
  const renderToolCall = useRenderToolCall();
  const results = new Map<string, ToolMessage>();
  for (const m of messages) if (m.role === "tool") results.set(m.toolCallId, m);

  const visible = messages.filter((m) => m.role === "user" || m.role === "assistant");
  const last = visible[visible.length - 1];
  const awaiting = running && (!last || last.role === "user" || (!textOf(last) && !(last as { toolCalls?: ToolCall[] }).toolCalls?.length));

  return (
    <>
      {visible.map((m) => {
        if (m.role === "user") {
          return (
            <div key={m.id} className="ml-8 self-end border-r-2 border-arcane/60 bg-arcane/10 px-3 py-2 text-sm text-foreground/95">
              {textOf(m)}
            </div>
          );
        }
        const calls = (m as { toolCalls?: ToolCall[] }).toolCalls ?? [];
        const text = textOf(m);
        if (!text && !calls.length) return null;
        return (
          <div key={m.id} className="space-y-2 border-l-2 border-system/50 pl-3 text-sm leading-relaxed text-foreground/90">
            {calls.map((call) =>
              PRESENTATION_TOOLS.has(call.function.name) ? (
                <div key={call.id}>{renderToolCall({ toolCall: call, toolMessage: results.get(call.id) })}</div>
              ) : (
                <ActionChip key={call.id} call={call} done={results.has(call.id)} />
              ),
            )}
            {text && <Markdown text={text} />}
          </div>
        );
      })}
      {awaiting && (
        <div className="flex items-center gap-2 border-l-2 border-system/30 pl-3 font-display text-[9px] tracking-[0.25em] text-system/80">
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1 animate-pulse bg-system" style={{ animationDelay: `${i * 160}ms` }} />
            ))}
          </span>
          {copy.thinking.toUpperCase()}
        </div>
      )}
    </>
  );
}

/**
 * The dialogue window with THE SYSTEM — a notched System panel on the
 * left (desktop) or a bottom sheet (touch). Headless CopilotKit v2:
 * `useAgent` for the conversation, `copilotkit.runAgent` to send, and
 * the registered frontend tools do the rest.
 */
export function SystemDialogue() {
  const open = useWorldStore((s) => s.dialogueOpen);
  const setOpen = useWorldStore((s) => s.setDialogueOpen);
  const panel = useWorldStore((s) => s.panel);
  const touch = useWorldStore((s) => s.touch);
  const closePanel = useWorldStore((s) => s.closePanel);
  const { agent } = useAgent({ agentId: SYSTEM_AGENT_ID });
  const { copilotkit } = useCopilotKit();
  const error = useLinkStatus((s) => s.error);
  const setError = useLinkStatus((s) => s.setError);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const messages = agent.messages as Message[];
  const running = agent.isRunning;
  const collapsed = touch && !!panel;

  useEffect(() => {
    live.agentBusy = running;
  }, [running]);

  useEffect(() => {
    if (!open) return;
    chime();
    if (!touch) window.setTimeout(() => input.current?.focus(), 350);
  }, [open, touch]);

  // follow the conversation as it streams
  const tail = messages.length ? `${messages.length}:${textOf(messages[messages.length - 1]).length}` : "0";
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [tail, running, open, collapsed]);

  const send = async (text: string) => {
    const content = text.trim().slice(0, 1200);
    if (!content || running) return;
    play("confirm", { volume: 0.35 });
    setError(null);
    setDraft("");
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content });
    try {
      await copilotkit.runAgent({ agent });
    } catch (err) {
      console.error("[system] run failed", err);
      setError(copy.offline);
    }
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    void send(draft);
  };

  const close = () => {
    play("close");
    setOpen(false);
  };

  const lastReply = [...messages].reverse().find((m) => m.role === "assistant" && textOf(m));

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="system-dialogue"
          role="dialog"
          aria-label={`${copy.name} — dialogue`}
          className={cn(
            "glass glass-edge notch sys-panel pointer-events-auto fixed z-40 flex flex-col [--n:16px] [--tone:var(--color-system)]",
            touch
              ? collapsed
                ? "inset-x-2 top-2"
                : "inset-x-2 bottom-2 h-[60dvh]"
              : "top-20 bottom-4 left-4 w-[min(420px,34vw)] [--n:18px]",
          )}
          initial={touch ? { y: collapsed ? "-110%" : "100%" } : { x: -80, opacity: 0, clipPath: "inset(0 0 100% 0)" }}
          animate={touch ? { y: 0 } : { x: 0, opacity: 1, clipPath: "inset(0 0 0% 0)" }}
          exit={touch ? { y: "100%" } : { x: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
        >
          <div className="sys-panel__scan" />
          <header className="relative flex items-center gap-3 border-b border-system/20 px-4 py-3 sm:px-5">
            <div className="grid size-9 shrink-0 rotate-45 place-items-center border border-system bg-system/10 shadow-[0_0_20px_oklch(0.72_0.14_235/0.35)]">
              <span className={cn("size-2 -rotate-45 bg-system", running && "animate-ping")} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[9px] tracking-[0.35em] text-system">[ {copy.name} ]</p>
              <p className="truncate text-sm text-muted-foreground italic">{running ? copy.thinking : copy.epithet}</p>
            </div>
            {collapsed && (
              <button type="button" aria-label="Expand dialogue" onClick={closePanel} className="hud-chip size-9 shrink-0">
                <ChevronUp className="size-4" />
              </button>
            )}
            <button type="button" aria-label="Close dialogue" onClick={close} className="hud-chip size-9 shrink-0">
              <X className="size-4" />
            </button>
          </header>

          {collapsed ? (
            <div className="mx-4 my-2.5 line-clamp-2 text-sm text-foreground/85">{lastReply ? textOf(lastReply) : copy.greeting}</div>
          ) : (
            <>
              <div ref={scroller} className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                <div className="border-l-2 border-system/50 pl-3 text-sm leading-relaxed text-foreground/90">{copy.greeting}</div>
                <Thread messages={messages} running={running} />
                {error && (
                  <p role="alert" className="border-l-2 border-ember/70 pl-3 text-sm text-ember">
                    {error}
                  </p>
                )}
                {!messages.some((m) => m.role === "user") && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {copy.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onPointerEnter={() => play("hover")}
                        onClick={() => void send(s)}
                        className="hud-chip px-3 py-1.5 text-xs"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={submit} className="border-t border-system/20 px-3 pt-3 pb-2 sm:px-4">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={input}
                    value={draft}
                    rows={1}
                    maxLength={1200}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                      } else if (e.key === "Escape") {
                        close();
                      }
                    }}
                    placeholder={copy.placeholder}
                    aria-label={copy.placeholder}
                    className="max-h-28 min-h-10 flex-1 resize-none border border-system/30 bg-black/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-system/70 focus:outline-none"
                  />
                  {running ? (
                    <button type="button" aria-label="Stop" onClick={() => copilotkit.stopAgent({ agent })} className="hud-chip size-10 shrink-0">
                      <Square className="size-3.5" />
                    </button>
                  ) : (
                    <button type="submit" aria-label="Send" disabled={!draft.trim()} className="hud-chip size-10 shrink-0 disabled:opacity-40">
                      <CornerDownLeft className="size-4" />
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground/60">{copy.footer}</p>
              </form>
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
