"use client";

import { useEffect, useRef } from "react";

type Shape = 0 | 1 | 2 | 3;
type State = "drift" | "cleared" | "quarantined";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  shape: Shape;
  state: State;
  decided: boolean;
  alpha: number;
  color: string;
}

const PLUM = "#8052ff";
const AMBER = "#ffb829";
const BONE = "#ffffff";
const SMOKE = "#9a9a9a";

/** The firewall, rendered. Inbound value-particles drift toward a violet screening
 *  membrane; most clear through, ~1 in 5 is caught and pulled into an amber eddy. */
export function Membrane() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext("2d");
    if (!context) return;
    const canvas = canvasEl;
    const ctx = context;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    let width = 0;
    let height = 0;
    let membraneX = 0;
    let particles: Particle[] = [];
    let raf = 0;
    let running = false;

    function decide(p: Particle): void {
      p.decided = true;
      if (Math.random() < 0.22) {
        p.state = "quarantined";
        p.color = AMBER;
        p.vy = rand(0.5, 1.2) * (height / 620);
        p.vx *= 0.45;
      } else {
        p.state = "cleared";
        p.color = Math.random() < 0.5 ? BONE : PLUM;
        p.alpha = Math.min(1, p.alpha + 0.28);
      }
    }

    function spawn(fromLeft: boolean): Particle {
      const center = height / 2;
      const y = center + (Math.random() - 0.5) * height * (0.55 + Math.random() * 0.45);
      const p: Particle = {
        x: fromLeft ? rand(-24, width * 0.1) : rand(0, width),
        y: Math.min(Math.max(y, 4), height - 4),
        vx: rand(0.16, 0.52) * (width / 620),
        vy: rand(-0.05, 0.05),
        size: rand(1.4, 4.4),
        shape: Math.floor(Math.random() * 4) as Shape,
        state: "drift",
        decided: false,
        alpha: rand(0.22, 0.66),
        color: SMOKE,
      };
      if (!fromLeft && p.x >= membraneX) decide(p);
      return p;
    }

    function drawShape(p: Particle): void {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      const s = p.size;
      switch (p.shape) {
        case 0:
          ctx.beginPath();
          ctx.arc(p.x, p.y, s * 0.6, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 1:
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - s);
          ctx.lineTo(p.x + s, p.y + s);
          ctx.lineTo(p.x - s, p.y + s);
          ctx.closePath();
          ctx.fill();
          break;
        case 2:
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - s);
          ctx.lineTo(p.x + s, p.y);
          ctx.lineTo(p.x, p.y + s);
          ctx.lineTo(p.x - s, p.y);
          ctx.closePath();
          ctx.fill();
          break;
        default:
          ctx.fillRect(p.x - s * 0.55, p.y - s * 0.55, s * 1.1, s * 1.1);
      }
    }

    function drawMembrane(t: number): void {
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = PLUM;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(membraneX, height * 0.05);
      ctx.lineTo(membraneX, height * 0.95);
      ctx.stroke();
      ctx.fillStyle = PLUM;
      for (let y = height * 0.08; y < height * 0.92; y += 24) {
        ctx.globalAlpha = 0.2 + 0.4 * Math.abs(Math.sin(y * 0.025 + t * 0.0012));
        ctx.fillRect(membraneX - 1, y, 2, 2.4);
      }
    }

    function frame(t: number): void {
      ctx.clearRect(0, 0, width, height);
      drawMembrane(t);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (!p.decided && p.x >= membraneX) decide(p);
        if (p.state === "quarantined") {
          p.vy += 0.012;
          p.alpha -= 0.005;
        } else if (p.state === "cleared" && p.x > width * 0.82) {
          p.alpha -= 0.011;
        }
        drawShape(p);
        if (p.x > width + 24 || p.y > height + 24 || p.alpha <= 0.015) {
          Object.assign(p, spawn(true));
        }
      }
      ctx.globalAlpha = 1;
      if (running) raf = requestAnimationFrame(frame);
    }

    function init(): void {
      const count = Math.min(720, Math.max(150, Math.floor((width * height) / 1700)));
      particles = Array.from({ length: count }, () => spawn(false));
    }

    function resize(): void {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      membraneX = width * 0.4;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init();
      if (reduce) {
        ctx.clearRect(0, 0, width, height);
        drawMembrane(0);
        for (const p of particles) drawShape(p);
        ctx.globalAlpha = 1;
      }
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    if (reduce) {
      return () => ro.disconnect();
    }

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? false;
        if (visible && !running) {
          running = true;
          raf = requestAnimationFrame(frame);
        } else if (!visible && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />;
}
