"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Sparkles, useGLTF } from "@react-three/drei";
import {
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Mesh,
  type Object3D,
  type PointLight,
} from "three";
import { world } from "@/config/world.config";
import { useWorldStore, type Quality } from "@/store/world-store";
import { ASSETS, COLORS, createFlameMaterial, createMistMaterial, createShaftMaterial } from "./assets";
import { registerFloor } from "./layout";

useGLTF.preload(ASSETS.hall, ASSETS.draco);

/** the hall's torches, [x, y, z] of each flame (measured from the model) */
const TORCHES: [number, number, number][] = [
  ...[6.04, 13.69, 21.54].flatMap((z): [number, number, number][] => [
    [-7.72, 4.3, z],
    [7.72, 4.3, z],
  ]),
  ...[-0.9, -4.5].flatMap((z): [number, number, number][] => [
    [-8.42, 4.95, z],
    [8.42, 4.95, z],
  ]),
];
/** the two fire bowls flanking the throne dais */
const BOWLS: [number, number, number][] = [
  [-7.36, 3.55, -8.1],
  [7.3, 3.55, -8.1],
];
/** real lights are expensive: one per pair of wall torches, nearest the floor they light */
const TORCH_LIGHTS: [number, number, number][] = [
  [-6.6, 4.1, 21.5],
  [6.6, 4.1, 13.7],
  [-6.6, 4.1, 6],
  [6.6, 4.1, -2.7],
];

const EMBER = "#ff7a2f";

/** grey out a texture and re-tint it (stained glass → moonlit violet glass) */
function monochrome(material: MeshBasicMaterial, tint: Color) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTint = { value: tint };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uTint;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = uTint * (0.35 + pow(lum, 1.4) * 2.2);`,
      );
  };
  // without its own cache key three.js would reuse a plain basic-material program
  material.customProgramCacheKey = () => "monochrome-glass";
}

/** greyscale a material's colour map */
function desaturate(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))) * vec3(0.8, 0.82, 1.0);`,
    );
  };
  material.customProgramCacheKey = () => "desaturate";
}

/** same idea for the walls: greyscale colour, glow re-tinted by the emissive colour */
function moonlitGlass(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#ifdef USE_EMISSIVEMAP
          vec4 glassTexel = texture2D(emissiveMap, vEmissiveMapUv);
          float glass = dot(glassTexel.rgb, vec3(0.299, 0.587, 0.114));
          totalEmissiveRadiance *= pow(glass, 1.3) * 1.6;
        #endif`,
      );
  };
  material.customProgramCacheKey = () => "moonlit-glass";
}

/**
 * Restyle the Throne Room into the Double Dungeon: cold violet stone,
 * a black carpet, banners the colour of the Monarch, and stained glass
 * that glows with moonlight instead of daylight. Materials are swapped by
 * name, so the source model stays untouched.
 */
function restyle(scene: Object3D) {
  const floors: Mesh[] = [];
  scene.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.material as MeshStandardMaterial;
    const name = `${mesh.name} ${src.name}`;
    mesh.receiveShadow = true;
    mesh.castShadow = !/Glass|Chandelier|Flag/.test(name);

    if (/Glass/.test(name)) {
      const glass = new MeshBasicMaterial({ map: src.map ?? src.emissiveMap, toneMapped: false });
      monochrome(glass, new Color(COLORS.arcane).multiplyScalar(1.15));
      mesh.material = glass;
      mesh.castShadow = false;
      return;
    }
    const m = src.clone();
    if (/Carpet/.test(name)) {
      m.color = new Color("#1d1428");
      m.roughness = 0.9;
    } else if (/Flag|Amblem/.test(name)) {
      m.color = new Color("#5b3aa0");
      m.emissive = new Color("#1a0b3a");
      m.emissiveIntensity = 0.5;
    } else if (/Windows/.test(name)) {
      // the side windows' panes: drained of daylight colour
      desaturate(m);
    } else if (/Throne/.test(name)) {
      m.color = new Color("#3a3552");
      m.metalness = 0.6;
      m.roughness = 0.35;
    } else if (/Wall_Base/.test(name)) {
      // the stained glass is painted into the walls' colour + glow maps: drain the
      // daylight colours and let the windows glow with cold moonlight instead
      m.color = new Color("#8f8ea3");
      m.emissive = new Color("#7d7cff");
      m.emissiveIntensity = 1.4;
      moonlitGlass(m);
    } else if (/BaseGround/.test(name)) {
      // matte: polished boards streak every torch across the floor
      m.color = new Color("#8b8898");
      m.roughness = 1;
      m.metalness = 0;
      m.envMapIntensity = 0.4;
      floors.push(mesh);
    } else {
      m.color = new Color(m.color).multiply(new Color("#a8a4c0"));
    }
    mesh.material = m;
  });
  return floors;
}

function Flame({ position, size = 1, seed }: { position: [number, number, number]; size?: number; seed: number }) {
  const mat = useMemo(() => createFlameMaterial(EMBER, "#ffe7b0", seed), [seed]);
  return (
    <mesh position={position} scale={[0.34 * size, 0.62 * size, 1]} material={mat} renderOrder={5}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

/** torch light that breathes with its flame */
function TorchLight({ position, seed, intensity }: { position: [number, number, number]; seed: number; intensity: number }) {
  const light = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 7 + seed * 13;
    if (light.current) light.current.intensity = intensity * (0.86 + Math.sin(t) * 0.06 + Math.sin(t * 2.7) * 0.05);
  });
  return <pointLight ref={light} position={position} color={EMBER} intensity={intensity} distance={14} decay={1.7} />;
}

/** moonlight through the high windows, as slanted slabs of light */
function Shafts({ strength }: { strength: number }) {
  const mat = useMemo(() => createShaftMaterial("#8fa2ff", strength), [strength]);
  const zs = [-1.5, 5.5, 12.5, 19.5];
  return (
    <>
      {zs.map((z) => (
        <mesh key={z} position={[2.4, 8.2, z]} rotation={[0, 0, 0.62]} material={mat}>
          <planeGeometry args={[2.2, 17, 1, 1]} />
        </mesh>
      ))}
    </>
  );
}

/**
 * The Double Dungeon — the temple the whole portfolio lives in.
 * Clicking the floor walks the Hunter there.
 */
export function Hall({ quality }: { quality: Quality }) {
  const { scene } = useGLTF(ASSETS.hall, ASSETS.draco);
  const floors = useMemo(() => restyle(scene), [scene]);
  const mist = useMemo(() => createMistMaterial("#8a93c8", quality === "low" ? 0.45 : 0.6), [quality]);
  const moveTo = useWorldStore((s) => s.moveTo);

  useEffect(() => {
    const off = floors.map((f) => registerFloor(f));
    return () => off.forEach((fn) => fn());
  }, [floors]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // a drag that ends on the floor is a camera orbit, not a move order
    if (e.delta > 6 || e.point.y > 1.2) return;
    e.stopPropagation();
    moveTo(e.point.x, e.point.z);
  };

  const lights = quality === "low" ? TORCH_LIGHTS.slice(0, 2) : TORCH_LIGHTS;
  const { hall } = world;

  return (
    <group>
      <primitive object={scene} onClick={onClick} />
      {TORCHES.map((p, i) => (
        <Flame key={i} position={p} seed={i} />
      ))}
      {BOWLS.map((p, i) => (
        <Flame key={`b${i}`} position={p} size={2.2} seed={20 + i} />
      ))}
      {lights.map((p, i) => (
        <TorchLight key={i} position={p} seed={i} intensity={22} />
      ))}
      {/* one light for both fire bowls, over the dais */}
      <TorchLight position={[0, 4.6, -7.4]} seed={9} intensity={34} />
      {quality !== "low" && <Shafts strength={quality === "high" ? 1 : 0.7} />}
      {/* mist pooled on the floor, thickest down the nave */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.35, (hall.north + hall.south) / 2]} material={mist} renderOrder={2}>
        <planeGeometry args={[hall.halfWidth * 2, hall.south - hall.north]} />
      </mesh>
      <Sparkles
        count={quality === "low" ? 60 : 180}
        scale={[15, 12, 44]}
        position={[0, 6, 4]}
        size={2.2}
        speed={0.18}
        color="#c9bcff"
        opacity={0.45}
      />
    </group>
  );
}
