"use client";

import { useEffect, useRef } from "react";

type Particle = { angle: number; radius: number; speed: number; size: number };

/** Spiral field behind the desk. Original canvas, not a copied widget. */
export function Vortex() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const particles: Particle[] = Array.from({ length: 140 }, (_, index) => ({
      angle: (index / 140) * Math.PI * 8,
      radius: 40 + (index % 20) * 18,
      speed: 0.004 + (index % 5) * 0.001,
      size: 1 + (index % 3),
    }));
    let frame = 0;
    let alive = true;

    const draw = () => {
      if (!alive) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.clearRect(0, 0, width, height);
      const cx = width * 0.5;
      const cy = height * 0.5;
      for (const particle of particles) {
        particle.angle += particle.speed;
        particle.radius -= 0.08;
        if (particle.radius < 12) particle.radius = Math.min(width, height) * 0.48;
        const x = cx + Math.cos(particle.angle) * particle.radius;
        const y = cy + Math.sin(particle.angle) * particle.radius * 0.62;
        context.beginPath();
        context.fillStyle = `rgba(232, 196, 122, ${0.15 + (frame % 20) / 80})`;
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      frame += 1;
      requestAnimationFrame(draw);
    };
    draw();
    return () => {
      alive = false;
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}
