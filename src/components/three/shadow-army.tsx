"use client";

import { useEffect, useMemo } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  Box3,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Mesh,
  Vector3,
  type Bone,
  type Group,
  type Object3D,
  type SkinnedMesh,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { ARCANE_PURPLE } from "./hologram-avatar";

const MODEL = "/models/player.glb";
const DRACO = "/draco/";
/** soldiers stand a touch shorter than the Monarch (3.2) */
const SOLDIER_HEIGHT = 3.0;
/** stage floor level */
const FLOOR_Y = -3;

/**
 * Legion formation: rows behind the Monarch (who stands at x≈-3.3),
 * fanning wider as they recede into the fog. Facing the camera.
 * Front-rank soldiers play the idle clip (time-staggered so they
 * never breathe in unison); the "Kneel" clip takes over for the
 * front rank automatically once it exists in the GLB.
 */
const FORMATION: { x: number; z: number; yaw: number }[] = [
  // front rank, flanking the Monarch
  { x: -7.2, z: -3.6, yaw: 0.14 },
  { x: 0.6, z: -3.6, yaw: -0.14 },
  // second rank
  { x: -9.4, z: -6.8, yaw: 0.1 },
  { x: -5.4, z: -6.6, yaw: 0.05 },
  { x: -1.2, z: -6.6, yaw: -0.05 },
  { x: 2.8, z: -6.8, yaw: -0.1 },
  { x: 6.8, z: -6.9, yaw: -0.14 },
  // rear rank, swallowed by the fog
  { x: -11.2, z: -10.4, yaw: 0.08 },
  { x: -7.4, z: -10.2, yaw: 0.04 },
  { x: -3.4, z: -10.2, yaw: 0 },
  { x: 0.6, z: -10.2, yaw: -0.04 },
  { x: 4.6, z: -10.4, yaw: -0.08 },
  { x: 8.6, z: -10.6, yaw: -0.12 },
];

/** shared assets — one geometry/material set for the whole legion */
// lit (not basic) so the under-light rims the silhouettes out of
// the void, plus a faint arcane self-glow in the surface
const shadowFlesh = new MeshStandardMaterial({
  color: "#171727",
  roughness: 0.8,
  metalness: 0.3,
  emissive: new Color("#241a4d"),
  emissiveIntensity: 1.0,
});
const eyeGeometry = new SphereGeometry(2.3, 8, 8); // bone-local units (cm)
// depthTest off: shadow eyes burn through the dark, and it keeps
// them visible even though they sit inside the head mesh
const eyeMaterial = new MeshBasicMaterial({
  color: ARCANE_PURPLE,
  transparent: true,
  opacity: 0.95,
  blending: AdditiveBlending,
  depthWrite: false,
  depthTest: false,
});

function findHeadBone(rig: Object3D): Bone | null {
  let head: Bone | null = null;
  rig.traverse((node) => {
    const bone = node as Bone;
    if (
      bone.isBone &&
      /Head$/.test(bone.name) &&
      !/HeadTop/.test(bone.name)
    ) {
      head = bone;
    }
  });
  return head;
}

interface ShadowSoldierProps {
  position: [number, number, number];
  yaw: number;
  /** stagger offset into the idle clip, in seconds */
  timeOffset: number;
}

function ShadowSoldier({ position, yaw, timeOffset }: ShadowSoldierProps) {
  const { scene, animations } = useGLTF(MODEL, DRACO);

  const rig = useMemo(() => {
    const cloned = cloneSkeleton(scene) as Group;
    cloned.traverse((node) => {
      const mesh = node as SkinnedMesh;
      if (mesh.isMesh) {
        mesh.material = shadowFlesh;
        mesh.frustumCulled = false;
      }
    });
    // the monarch's mark: burning purple eyes, riding the head bone
    const head = findHeadBone(cloned);
    if (head) {
      for (const side of [-1, 1]) {
        const eye = new Mesh(eyeGeometry, eyeMaterial);
        eye.position.set(side * 3.2, 9, 9.5);
        head.add(eye);
      }
    }
    return cloned;
  }, [scene]);

  const fit = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const scale = SOLDIER_HEIGHT / (size.y || 1);
    return { scale, yOffset: -box.min.y * scale };
  }, [scene]);

  const { actions, mixer } = useAnimations(animations, rig);
  useEffect(() => {
    // the whole legion breathes, staggered so it never syncs up.
    // "Kneel" (a future Mixamo drop into the GLB) wins if present.
    const action = actions.Kneel ?? actions.Idle;
    if (!action) return;
    action.reset().play();
    mixer.setTime(timeOffset);
    return () => {
      action.stop();
    };
  }, [actions, mixer, timeOffset]);

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <primitive object={rig} scale={fit.scale} position={[0, fit.yOffset, 0]} />
    </group>
  );
}

/**
 * Sung Jin-Woo energy: the Player's shadow legion, risen and
 * arrayed behind the Monarch. Every soldier reuses the one cached
 * GLB (cloned skeletons share geometry), so the army costs no
 * extra download — it replaced the far heavier reflective floor,
 * gate and colonnade of v4.6/4.7.
 */
export function ShadowArmy() {
  return (
    <>
      {FORMATION.map((slot, i) => (
        <ShadowSoldier
          key={`${slot.x}:${slot.z}`}
          position={[slot.x, FLOOR_Y, slot.z]}
          yaw={slot.yaw}
          timeOffset={(i * 1.37) % 6}
        />
      ))}
      {/* cold under-lights so silhouettes separate from the void */}
      <pointLight
        color={ARCANE_PURPLE}
        intensity={11}
        distance={26}
        position={[-3, -1, -7]}
      />
      <pointLight
        color={ARCANE_PURPLE}
        intensity={8}
        distance={22}
        position={[5, -1, -8]}
      />
    </>
  );
}
