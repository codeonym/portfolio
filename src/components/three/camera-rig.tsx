"use client";

import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";

const BASE = { x: 0, y: 0.2, z: 8.5 } as const;

interface CameraRigProps {
  /** freeze the rig (reduced motion) */
  frozen?: boolean;
}

/**
 * VR-style head sway: the camera drifts toward the pointer, lerped
 * so it feels like leaning, never snapping. Pointer is normalized by
 * R3F (-1..1 on both axes).
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
    camera.lookAt(0, -0.2, 0);
  });

  return null;
}
