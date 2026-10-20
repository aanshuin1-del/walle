"use client";

import { useEffect, useRef } from "react";

type Particle = {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  gold: boolean;
};

/** Spiral field. Original canvas, drawn for the desk rather than copied from a widget. */
export function Vortex() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const particles: Particle[] = Array.from({ length: 180 }, (_, index) => ({
      angle: (index / 180) * Math.PI * 10,
      radius: 24 + (index % 28) * 16,
      speed: 0.0022 + (index % 7) * 0.00045,
      size: index % 11 === 0 ? 2.4 : 0.8 + (index % 3) * 0.45,
      gold: index % 4 !== 0,
    }));
    let alive = true;

    const draw = () => {
      if (!alive) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const glow = context.createRadialGradient(width * 0.55, height * 0.42, 20, width * 0.5, height * 0.5, width * 0.55);
      glow.addColorStop(0, "rgba(196, 154, 74, 0.16)");
      glow.addColorStop(0.45, "rgba(40, 58, 92, 0.12)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      const cx = width * 0.52;
      const cy = height * 0.46;
      for (const particle of particles) {
        particle.angle += particle.speed;
        particle.radius -= 0.055;
        if (particle.radius < 8) particle.radius = Math.min(width, height) * 0.52;
        const x = cx + Math.cos(particle.angle) * particle.radius;
        const y = cy + Math.sin(particle.angle) * particle.radius * 0.58;
        const fade = Math.max(0.12, 1 - particle.radius / (Math.min(width, height) * 0.55));
        context.beginPath();
        context.fillStyle = particle.gold ? `rgba(226, 196, 140, ${0.22 + fade * 0.45})` : `rgba(210, 220, 235, ${0.12 + fade * 0.3})`;
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      requestAnimationFrame(draw);
    };
    draw();
    return () => {
      alive = false;
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}
