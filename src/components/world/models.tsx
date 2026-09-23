"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Color, type Material, type Mesh, type Object3D } from "three";
import { ASSETS, forgedMaterials } from "./assets";

useGLTF.preload(ASSETS.kit, ASSETS.draco);
useGLTF.preload(ASSETS.forged, ASSETS.draco);

type Vec3 = [number, number, number];

interface PlaceProps {
  position?: Vec3;
  rotation?: number;
  scale?: number | Vec3;
  castShadow?: boolean;
}

/* ── KayKit dungeon pieces ────────────────────────────────── */

// the kit's warm gradient atlas, pulled toward the island's cold night
const KIT_TINT = new Color("#8f88ad");
const tinted = new WeakSet<Material>();

function tintKit(root: Object3D) {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mat = mesh.material as Material & { color?: Color; roughness?: number };
    if (!tinted.has(mat) && mat.color) {
      mat.color.multiply(KIT_TINT);
      if (mat.roughness !== undefined) mat.roughness = 0.85;
      tinted.add(mat);
    }
  });
}

/** one named piece of the dungeon kit (see scripts/assets pipeline for the list) */
export function Kit({ name, position, rotation = 0, scale = 1 }: PlaceProps & { name: string }) {
  const { scene } = useGLTF(ASSETS.kit, ASSETS.draco);
  const piece = useMemo(() => {
    const src = scene.getObjectByName(name);
    if (!src) return null;
    tintKit(src);
    // clone shares geometry + material — instances are nearly free
    const copy = src.clone();
    copy.position.set(0, 0, 0);
    return copy;
  }, [scene, name]);
  if (!piece) return null;
  return <primitive object={piece} position={position} rotation={[0, rotation, 0]} scale={scale} />;
}

/* ── forged set (scripts/assets/forge.py) ─────────────────── */

const swapped = new WeakSet<Object3D>();

function applyForgedMaterials(root: Object3D) {
  if (swapped.has(root)) return;
  swapped.add(root);
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = list.map((m) => forgedMaterials[m.name as keyof typeof forgedMaterials] ?? m);
    mesh.material = Array.isArray(mesh.material) ? next : next[0];
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

export function useForged(name: string) {
  const { scene } = useGLTF(ASSETS.forged, ASSETS.draco);
  return useMemo(() => {
    applyForgedMaterials(scene);
    const src = scene.getObjectByName(name);
    if (!src) return null;
    const copy = src.clone();
    copy.position.set(0, 0, 0);
    return copy;
  }, [scene, name]);
}

export function Forged({ name, position, rotation = 0, scale = 1 }: PlaceProps & { name: string }) {
  const obj = useForged(name);
  if (!obj) return null;
  return <primitive object={obj} position={position} rotation={[0, rotation, 0]} scale={scale} />;
}
