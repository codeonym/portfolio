import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
} from "three";
import type { Tone } from "@/config/types";

/** every streamed asset the world needs — preloaded behind the loading screen */
export const ASSETS = {
  draco: "/draco/",
  /** Sung Jin-Woo, the Player — the Hunter's clips retargeted onto his rig */
  sung: "/models/world/sung.glb",
  /** Igris — every extracted shadow soldier */
  igris: "/models/world/igris.glb",
  /** the Shadow Wraith — THE SYSTEM's body above the Awakening Circle */
  wraith: "/models/world/wraith.glb",
  /** Sketchfab props (CC-BY, credited at the Shadow Gate) */
  props: {
    throne: "/models/world/throne.glb",
    gargoyle: "/models/world/gargoyle.glb",
    brazier: "/models/world/brazier.glb",
    angel: "/models/world/angel.glb",
  },
  kit: "/models/world/dungeon-kit.glb",
  forged: "/models/world/forged.glb",
  hdri: "/env/night.hdr",
  stone: {
    map: "/textures/stone/diff.jpg",
    normalMap: "/textures/stone/nor_gl.jpg",
    roughnessMap: "/textures/stone/rough.jpg",
    aoMap: "/textures/stone/ao.jpg",
  },
} as const;

export type PropName = keyof typeof ASSETS.props;

/**
 * One clock for every shader in the world: materials share this uniform
 * object, and <ShaderClock /> advances it once per frame.
 */
export const shaderTime = { value: 0 };

/* ── palette ─────────────────────────────────────────────── */
export const COLORS = {
  void: "#05040b",
  fog: "#0b0818",
  arcane: "#8b5cf6",
  arcaneHot: "#b18cff",
  system: "#38bdf8",
  gold: "#f5b83d",
  ember: "#ff6a3d",
  bone: "#d9d2c3",
} as const;

export const toneColor: Record<Tone, string> = {
  system: COLORS.system,
  arcane: COLORS.arcane,
  gold: COLORS.gold,
  ember: COLORS.ember,
};

/* ── shared materials for the forged set (swapped in by name) ── */
export const forgedMaterials = {
  obsidian: new MeshStandardMaterial({
    color: "#0d0b16",
    roughness: 0.28,
    metalness: 0.55,
    emissive: new Color("#140c2c"),
    emissiveIntensity: 0.6,
  }),
  rock: new MeshStandardMaterial({
    color: "#1b1824",
    roughness: 0.92,
    metalness: 0.05,
    emissive: new Color("#0c0818"),
    flatShading: false,
  }),
  // rune glow is pushed past 1.0 so it blooms; toneMapped off keeps it hot
  rune: new MeshBasicMaterial({ color: new Color(COLORS.arcane).multiplyScalar(2.2), toneMapped: false }),
  crystal: new MeshStandardMaterial({
    color: "#4b2a9c",
    roughness: 0.12,
    metalness: 0.3,
    emissive: new Color(COLORS.arcane),
    emissiveIntensity: 1.3,
    transparent: true,
    opacity: 0.92,
  }),
  gold: new MeshStandardMaterial({ color: COLORS.gold, metalness: 1, roughness: 0.28, emissive: new Color("#4a2e00"), emissiveIntensity: 0.6 }),
  card: new MeshStandardMaterial({ color: "#0e1322", roughness: 0.35, metalness: 0.4 }),
};

/* ── fake light pool: an additive radial glow laid on the floor ──
   (real point lights cost every lit pixel a loop iteration; these cost a quad) */
export function createGlowMaterial(color: string, strength = 1) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uColor: { value: new Color(color) }, uStrength: { value: strength }, uTime: shaderTime },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float g = pow(max(0.0, 1.0 - r), 2.2) * (0.9 + 0.1 * sin(uTime * 2.3));
        gl_FragColor = vec4(uColor, g * 0.55 * uStrength);
      }
    `,
  });
}

/* ── the Gate rift: a swirling vortex shader on the forged oval ── */
export function createPortalMaterial(colorA: string = COLORS.arcane, colorB: string = COLORS.system, speed = 1) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    uniforms: {
      uTime: shaderTime,
      uSpeed: { value: speed },
      uColorA: { value: new Color(colorA) },
      uColorB: { value: new Color(colorB) },
      uPulse: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uPulse;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec2 vUv;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
                   mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
        return v;
      }

      void main() {
        float t = uTime * uSpeed;
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        float ang = atan(p.y, p.x);
        // spiral coordinates: twist harder toward the core
        float swirl = ang + 3.2 / (r + 0.35) - t * 0.9;
        vec2 q = vec2(cos(swirl), sin(swirl)) * r * 2.4;
        float n = fbm(q * 1.6 + t * 0.15);
        float bands = smoothstep(0.35, 0.95, n + 0.25 * sin(r * 14.0 - t * 3.0));
        vec3 col = mix(uColorA * 0.25, uColorA * 1.6, bands);
        col = mix(col, uColorB * 1.8, pow(n, 3.0) * 1.4);
        // blinding core + lit rim
        col += uColorB * 2.5 * smoothstep(0.35, 0.0, r) * (0.7 + 0.3 * sin(t * 2.0));
        col += uColorA * 2.0 * smoothstep(0.8, 1.0, r);
        col *= 1.0 + uPulse * 1.5;
        float alpha = smoothstep(1.0, 0.92, r) * (0.82 + 0.18 * n);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

/* ── vertical light pillar over zone markers (fades up and at the edges) ── */
export function createBeamMaterial(color: string) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
    uniforms: { uTime: shaderTime, uColor: { value: new Color(color) }, uStrength: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uStrength;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float edge = pow(sin(vUv.x * 3.14159), 3.0);
        float fade = pow(1.0 - vUv.y, 1.6);
        float flow = 0.75 + 0.25 * sin(vUv.y * 30.0 - uTime * 4.0);
        gl_FragColor = vec4(uColor * 1.6, edge * fade * flow * 0.55 * uStrength);
      }
    `,
  });
}

/* ── rune road: dashed energy flowing along the path strips ── */
export function createPathMaterial(color: string) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uTime: shaderTime, uColor: { value: new Color(color) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float core = smoothstep(0.55, 1.0, across);
        float dash = smoothstep(0.35, 0.5, fract(vUv.y * 9.0 - uTime * 0.6));
        float ends = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
        float a = (core * 0.85 + across * 0.12) * (0.35 + 0.65 * dash) * ends;
        gl_FragColor = vec4(uColor * 1.4, a * 0.7);
      }
    `,
  });
}
