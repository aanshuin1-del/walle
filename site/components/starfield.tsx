"use client";

import { useEffect, useRef } from "react";

/** Quiet star field behind the sign-in screen. */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.7 + 0.15,
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
      for (const star of stars) {
        context.beginPath();
        context.fillStyle = `rgba(255,255,255,${star.a})`;
        context.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
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
