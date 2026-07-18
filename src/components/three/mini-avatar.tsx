"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import {
  AdditiveBlending,
  Box3,
  MeshBasicMaterial,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { ARCANE_PURPLE, SYSTEM_BLUE } from "./hologram-avatar";

const MODEL = "/models/player.glb";
const DRACO = "/draco/";
/** normalized rig height inside the portrait scene */
const RIG_HEIGHT = 3.2;

function Bust() {
  const sway = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL, DRACO);
  // the main stage already owns `scene` — a portrait needs its own rig
  const rig = useMemo(() => {
    const cloned = cloneSkeleton(scene) as Group;
    let tone = 0;
    cloned.traverse((node) => {
      const mesh = node as Mesh;
      if (mesh.isMesh) {
        // solid glow silhouette, not wireframe: at portrait size the
        // dense wire lines are subpixel and burn to a white blob
        mesh.material = new MeshBasicMaterial({
          color: tone % 2 === 0 ? ARCANE_PURPLE : SYSTEM_BLUE,
          transparent: true,
          opacity: tone % 2 === 0 ? 0.32 : 0.45,
          blending: AdditiveBlending,
          depthWrite: false,
        });
        tone += 1;
        mesh.frustumCulled = false;
      }
    });
    return cloned;
  }, [scene]);

  const fit = useMemo(() => {
    const box = new Box3().setFromObject(rig);
    const size = box.getSize(new Vector3());
    const scale = RIG_HEIGHT / (size.y || 1);
    // vertically center the scaled rig on the origin
    return { scale, yOffset: -box.min.y * scale - RIG_HEIGHT / 2 };
  }, [rig]);

  const { actions } = useAnimations(animations, rig);
  useEffect(() => {
    const idle = actions.Idle;
    idle?.reset().play();
    return () => {
      idle?.stop();
    };
  }, [actions]);

  useFrame(({ clock }) => {
    // portrait sway, like a character-select screen
    if (sway.current) {
      sway.current.rotation.y = Math.sin(clock.elapsedTime * 0.45) * 0.35;
    }
  });

  return (
    <group ref={sway}>
      {/* full figure, centered — character-select framing */}
      <group position={[0, fit.yOffset, 0]}>
        <primitive object={rig} scale={fit.scale} />
      </group>
    </group>
  );
}

/**
 * The Player's live portrait for the STATUS window: the same rig
 * as the stage hologram, cloned into a tiny character-select frame.
 */
export function MiniAvatar({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  return (
    <div className={className}>
      <Canvas
        frameloop={reduced ? "demand" : "always"}
        dpr={1.5}
        camera={{ position: [0, 0.15, 5.6], fov: 34 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Bust />
        </Suspense>
        <pointLight
          color={ARCANE_PURPLE}
          intensity={4}
          distance={6}
          position={[0, 0.6, 1.2]}
        />
      </Canvas>
    </div>
  );
}
