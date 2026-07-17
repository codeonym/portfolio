"use client";

import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";

const BASE = { x: 0, y: 0.2 } as const;
/** dolly range — near enough to fill the view with the core, far enough to see the void */
const Z_NEAR = 5.4;
const Z_FAR = 11.5;
const INITIAL_Z = 8.5;

// zoom lives outside React: written by the wheel listener, read per-frame,
// so scrolling never causes a render
const dolly = { zoom: (INITIAL_Z - Z_NEAR) / (Z_FAR - Z_NEAR) };

/** Nudge the camera dolly; positive deltas pull back, negative dive in. */
export function nudgeZoom(delta: number) {
  dolly.zoom = MathUtils.clamp(dolly.zoom + delta, 0, 1);
}

interface CameraRigProps {
  /** freeze the rig (reduced motion) */
  frozen?: boolean;
}

/**
 * VR-style head sway plus scroll dolly: the camera drifts toward the
 * pointer and glides along z toward the wheel-set zoom target, lerped
 * so it feels like leaning and stepping, never snapping.
 */
export function CameraRig({ frozen }: CameraRigProps) {
  useFrame(({ camera, pointer }, delta) => {
    if (frozen) return;
    const ease = 1 - Math.exp(-delta * 2.2);
    camera.position.x = MathUtils.lerp(
      camera.position.x,
      BASE.x + pointer.x * 0.9,
      ease,
    );
    camera.position.y = MathUtils.lerp(
      camera.position.y,
      BASE.y + pointer.y * 0.5,
      ease,
    );
    camera.position.z = MathUtils.lerp(
      camera.position.z,
      MathUtils.lerp(Z_NEAR, Z_FAR, dolly.zoom),
      ease,
    );
    camera.lookAt(0, -0.2, 0);
  });

  return null;
}
