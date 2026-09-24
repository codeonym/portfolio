import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  ShaderMaterial,
} from "three";
import type { Tone } from "@/config/types";

/** every streamed asset the world needs — preloaded behind the loading screen */
export const ASSETS = {
  draco: "/draco/",
  /** the temple — Sketchfab "Throne Room", trimmed (scripts/assets/hall.py) */
  hall: "/models/world/hall.glb",
  /** Sung Jin-Woo, the Player — Mixamo motion capture retargeted onto his rig */
  sung: "/models/world/sung.glb",
  /** the shadow knights — Mixamo Paladin carrying Igris's sword and plume */
  knight: "/models/world/knight.glb",
  /** the Shadow Wraith — THE SYSTEM's body above the throne */
  wraith: "/models/world/wraith.glb",
  /** station props (Sketchfab, CC BY — credited at the Shadow Gate) */
  props: {
    lectern: "/models/world/lectern.glb",
    chest: "/models/world/chest.glb",
    coins: "/models/world/coins.glb",
    sword: "/models/world/sword.glb",
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

/* ── flame: a camera-facing card with rising, flickering noise ── */
export function createFlameMaterial(color: string = "#ff8a3d", core: string = "#fff1c1", seed = 0) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: shaderTime,
      uSeed: { value: seed },
      uColor: { value: new Color(color) },
      uCore: { value: new Color(core) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        // billboard: keep the card's centre, face the camera
        vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 scale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
        mv.xy += position.xy * scale;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSeed;
      uniform vec3 uColor;
      uniform vec3 uCore;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        float t = uTime * 1.6 + uSeed * 7.0;
        vec2 p = vUv;
        // licks rise and sway; narrower toward the tip
        float n = noise(vec2(p.x * 4.0 + uSeed, p.y * 3.0 - t * 2.2)) * 0.6 + noise(vec2(p.x * 9.0, p.y * 7.0 - t * 3.5)) * 0.4;
        float sway = (noise(vec2(t * 0.7, uSeed)) - 0.5) * 0.18 * p.y;
        float width = mix(0.36, 0.02, pow(p.y, 0.8));
        float d = abs(p.x - 0.5 - sway) / width;
        float body = smoothstep(1.0, 0.2, d + (n - 0.5) * 0.9 * p.y) * smoothstep(1.0, 0.55, p.y + n * 0.25) * smoothstep(0.0, 0.08, p.y);
        float hot = smoothstep(0.55, 0.0, d) * smoothstep(0.55, 0.05, p.y);
        vec3 col = mix(uColor, uCore, hot) * (1.6 + hot * 2.0);
        gl_FragColor = vec4(col, body * (0.75 + 0.25 * n));
      }
    `,
  });
}

/* ── light shaft: a soft additive slab of moonlight with drifting dust ── */
export function createShaftMaterial(color: string, strength = 1) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
    uniforms: { uTime: shaderTime, uColor: { value: new Color(color) }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uStrength;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vWorld;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        float edge = pow(sin(vUv.x * 3.14159), 2.0);
        // brightest at the window, dissolving toward the floor
        float fall = smoothstep(0.0, 0.25, vUv.y) * pow(vUv.y, 0.6);
        float drift = 0.65 + 0.35 * noise(vec2(vWorld.x * 0.6 + uTime * 0.05, vWorld.y * 0.4 - uTime * 0.08));
        gl_FragColor = vec4(uColor, edge * fall * drift * 0.16 * uStrength);
      }
    `,
  });
}

/* ── ground mist: slow layered noise hugging the floor ── */
export function createMistMaterial(color: string, strength = 1) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: { uTime: shaderTime, uColor: { value: new Color(color) }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uStrength;
      uniform vec3 uColor;
      varying vec3 vWorld;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; } return v; }
      void main() {
        vec2 p = vWorld.xz * 0.18;
        float n = fbm(p + vec2(uTime * 0.03, uTime * 0.02)) * 0.6 + fbm(p * 1.7 - vec2(uTime * 0.05, 0.0)) * 0.4;
        float edges = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.96, vUv.y);
        float a = smoothstep(0.35, 0.85, n) * edges * 0.32 * uStrength;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
}

/* ── rune sigil: a slowly turning ring of glyph ticks on the floor ── */
export function createSigilMaterial(color: string) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
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
      float ring(float r, float at, float w) { return smoothstep(w, 0.0, abs(r - at)); }
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        float a = atan(p.y, p.x);
        float spin = a + uTime * 0.12;
        float ticks = step(0.55, fract(spin * 48.0 / 6.28318)) * ring(r, 0.8, 0.05);
        float glyphs = step(0.7, fract(sin(floor((a - uTime * 0.07) * 12.0 / 6.28318 * 3.0) * 91.7) * 43758.5)) * ring(r, 0.66, 0.035);
        float lines = ring(r, 0.93, 0.012) + ring(r, 0.72, 0.008) + ring(r, 0.55, 0.01) * 0.6;
        float glow = smoothstep(1.0, 0.0, r) * 0.08;
        float pulse = 0.75 + 0.25 * sin(uTime * 1.3);
        float v = (lines + ticks * 0.8 + glyphs * 0.7) * pulse + glow;
        gl_FragColor = vec4(uColor * 1.8, v * uStrength * smoothstep(1.0, 0.97, r));
      }
    `,
  });
}

/**
 * Rim light: a view-dependent glow on silhouettes, so dark characters
 * still read against a dark hall. Patches a standard material in place.
 */
export function addRim(material: MeshStandardMaterial, color: string, strength = 1, power = 2.6) {
  const uniforms = { uRimColor: { value: new Color(color) }, uRimStrength: { value: strength }, uRimPower: { value: power } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStrength;\nuniform float uRimPower;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), uRimPower);
        totalEmissiveRadiance += uRimColor * rim * uRimStrength;`,
      );
  };
  material.customProgramCacheKey = () => `rim-${power}`;
  return uniforms;
}
