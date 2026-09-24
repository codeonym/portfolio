"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles, useGLTF } from "@react-three/drei";
import { Box3, Color, MeshStandardMaterial, Vector3, type Group, type Mesh, type PointLight } from "three";
import { live } from "@/store/world-store";
import { ASSETS, COLORS, createGlowMaterial, shaderTime } from "./assets";

useGLTF.preload(ASSETS.wraith, ASSETS.draco);

/** THE SYSTEM towers behind the throne — about four Hunters tall */
const HEIGHT = 8.4;
/** it floats in the apse, just behind the throne's back */
const AT: [number, number, number] = [0, 1.1, -12.2];

/**
 * The robe in the wind: vertices sway and ripple, more toward the hem
 * (the hood barely moves). `uSurge` quickens it while THE SYSTEM thinks.
 */
function createRobe(src: MeshStandardMaterial, bottom: number, height: number) {
  const uniforms = { uTime: shaderTime, uSurge: { value: 1 }, uBottom: { value: bottom }, uHeight: { value: height } };
  const m = new MeshStandardMaterial({
    map: src.map,
    emissiveMap: src.map,
    color: new Color("#7f7a9e"),
    emissive: new Color(COLORS.arcaneHot),
    emissiveIntensity: 0.5,
    roughness: 0.8,
    metalness: 0.1,
    side: src.side,
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime; uniform float uSurge; uniform float uBottom; uniform float uHeight;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        // 0 at the hood, 1 at the hem (model space is y-up, feet at the bottom)
        float hem = clamp(1.0 - (position.y - uBottom) / uHeight, 0.0, 1.0);
        float w = pow(hem, 1.7);
        float t = uTime * (0.9 + uSurge * 0.35);
        transformed.x += (sin(t * 1.3 + position.y / uHeight * 9.0) * 0.6 + sin(t * 2.7 + position.z / uHeight * 20.0) * 0.25) * w * uHeight * 0.018;
        transformed.z += (cos(t * 1.1 + position.y / uHeight * 7.0 + position.x / uHeight * 12.0) * 0.7) * w * uHeight * 0.024;
        transformed.y += sin(t * 2.0 + position.x / uHeight * 25.0) * w * uHeight * 0.005;`,
      );
  };
  m.customProgramCacheKey = () => "wraith-robe";
  return { material: m, uniforms };
}

/**
 * THE SYSTEM's body — the Shadow Wraith, a giant hooded shadow looming
 * over the throne. It turns to watch the Hunter, its robe stirs in a wind
 * no one else feels, and while the agent is thinking everything surges.
 */
export function Wraith() {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const halo = useRef<Mesh>(null);
  const light = useRef<PointLight>(null);
  const { scene } = useGLTF(ASSETS.wraith, ASSETS.draco);

  const fit = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = HEIGHT / (size.y || 1);
    scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      // the robe shader measures height in the mesh's own space
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      const robe = createRobe(mesh.material as MeshStandardMaterial, bb ? bb.min.y : 0, bb ? bb.max.y - bb.min.y || 1 : 1);
      mesh.material = robe.material;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      // the frame loop reaches the robe through the scene graph
      mesh.userData.robe = robe;
    });
    return { scale, offset: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number] };
  }, [scene]);

  const haloMat = useMemo(() => createGlowMaterial(COLORS.arcane, 1.4), []);

  const surge = useRef(1);
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    surge.current += ((live.agentBusy ? 4 : 1) - surge.current) * Math.min(1, delta * 2.5);
    const k = surge.current;
    const g = root.current;
    if (g) {
      g.position.y = AT[1] + Math.sin(t * 0.55) * 0.18;
      // turn (slowly — it is very large) to watch the Hunter
      const want = Math.atan2(live.hunter.x - AT[0], live.hunter.z - AT[2]);
      let d = (want - g.rotation.y) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      g.rotation.y += Math.max(-0.5, Math.min(0.5, d)) * Math.min(1, delta * 0.6);
    }
    body.current?.traverse((node) => {
      const robe = node.userData.robe as ReturnType<typeof createRobe> | undefined;
      if (!robe) return;
      robe.uniforms.uSurge.value = k;
      robe.material.emissiveIntensity = 0.42 + 0.1 * Math.sin(t * 1.2) + (k - 1) * 0.25;
    });
    if (halo.current) halo.current.scale.setScalar(1 + (k - 1) * 0.12 + Math.sin(t * 0.9) * 0.03);
    if (light.current) light.current.intensity = 26 + (k - 1) * 14 + Math.sin(t * 1.2) * 3;
  });

  return (
    <group ref={root} position={AT}>
      <group ref={body}>
        <primitive object={scene} scale={fit.scale} position={fit.offset} />
      </group>
      {/* a cold aura behind the hood */}
      <mesh ref={halo} position={[0, HEIGHT * 0.8, -0.9]} material={haloMat}>
        <planeGeometry args={[7, 7]} />
      </mesh>
      <pointLight ref={light} color={COLORS.arcane} intensity={26} distance={16} decay={1.5} position={[0, HEIGHT * 0.55, 2.4]} />
      {/* shadow drifting off the robe */}
      <Sparkles count={60} scale={[4, HEIGHT, 3]} position={[0, HEIGHT * 0.45, 0]} size={3} speed={0.3} color={COLORS.arcaneHot} opacity={0.7} />
    </group>
  );
}
