"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Color, Vector3, type Material, type Mesh, type Object3D } from "three";
import { ASSETS, forgedMaterials, type PropName } from "./assets";

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

/* ── Sketchfab props (scripts/assets/pack-sketchfab.mjs) ──── */

for (const url of Object.values(ASSETS.props)) useGLTF.preload(url, ASSETS.draco);

const PROP_TINT = new Color("#a39cc4");
const propReady = new WeakSet<Object3D>();

/**
 * A prop stood on the ground at `height` units, centered on its footprint.
 * Clones share geometry and materials; the night tint is applied once.
 */
export function Prop({ name, height, position, rotation = 0 }: Omit<PlaceProps, "scale"> & { name: PropName; height: number }) {
  const { scene } = useGLTF(ASSETS.props[name], ASSETS.draco);
  const { copy, scale, offset } = useMemo(() => {
    if (!propReady.has(scene)) {
      propReady.add(scene);
      scene.traverse((node) => {
        const mesh = node as Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as Material & { color?: Color };
        mat.color?.multiply(PROP_TINT);
      });
    }
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const s = height / (size.y || 1);
    return {
      copy: scene.clone(),
      scale: s,
      offset: [-center.x * s, -box.min.y * s, -center.z * s] as Vec3,
    };
  }, [scene, height]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <primitive object={copy} scale={scale} position={offset} />
    </group>
  );
}
