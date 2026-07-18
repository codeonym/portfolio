"use client";

import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { ParticleField } from "@/components/system/particle-field";
import { CameraRig, nudgeZoom } from "./camera-rig";
import { HologramAvatar } from "./hologram-avatar";
import { LobbyEffects } from "./lobby-effects";
import { StageEnvironment } from "./stage-environment";

/**
 * The immersive 3D void behind the OS chrome: hologram avatar on the
 * left third (under the DOM caption), grid floor, mana dust, fog and
 * a pointer-swayed camera. Scrolling over the open stage dollies the
 * camera in and out. Degrades to the 2D ParticleField when WebGL is
 * unavailable; reduced motion freezes to a single frame.
 */
export function SystemScene() {
  const reduced = useReducedMotion();

  useEffect(() => {
    // single wheel router for the whole OS. Window content is scrolled
    // in JS: compositor-routed wheel scrolling is unreliable while the
    // root element is fullscreen, so we take over deterministically.
    const onWheel = (e: WheelEvent) => {
      const el = e.target as Element | null;
      const scroller = el?.closest<HTMLElement>("[data-window-scroll]");
      if (scroller) {
        e.preventDefault();
        const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        scroller.scrollBy({ top: dy });
        return;
      }
      // the rest of a window, top bar and dock are inert HUD chrome
      if (el?.closest('[role="dialog"], header, footer')) return;
      if (!reduced) nudgeZoom(e.deltaY * 0.0009);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [reduced]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        fallback={<ParticleField />}
        frameloop={reduced ? "demand" : "always"}
        camera={{ position: [0, 0.2, 8.5], fov: 50 }}
        // floor of 1.5 supersamples 1x displays — wireframes stay crisp
        dpr={[1.5, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        eventSource={typeof document !== "undefined" ? document.body : undefined}
      >
        {/* opaque background: the post chain composites against it,
            and it matches the page's own dark navy */}
        <color attach="background" args={["#0e1220"]} />
        <fog attach="fog" args={["#0e1220", 10, 34]} />
        <ambientLight intensity={0.4} />
        <CameraRig frozen={!!reduced} />
        <HologramAvatar position={[-3.3, 0.1, 0]} />
        <StageEnvironment />
        <LobbyEffects />
      </Canvas>
    </div>
  );
}
