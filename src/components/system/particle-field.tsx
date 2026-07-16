"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vy: number;
  size: number;
  alpha: number;
  hue: "blue" | "purple";
}

/** Drifting mana-dust background, fixed behind all content. */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(90, Math.floor(window.innerWidth / 16));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vy: 0.15 + Math.random() * 0.35,
        size: 0.6 + Math.random() * 1.6,
        alpha: 0.15 + Math.random() * 0.4,
        hue: Math.random() > 0.25 ? "blue" : "purple",
      }));
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y -= p.vy;
        if (p.y < -4) {
          p.y = canvas.height + 4;
          p.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle =
          p.hue === "blue"
            ? `rgba(96, 176, 255, ${p.alpha})`
            : `rgba(158, 110, 255, ${p.alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    tick();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
