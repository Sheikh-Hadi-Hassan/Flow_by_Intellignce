"use client";

import { useLayoutEffect, useRef } from "react";

export type VoiceSurfaceState = "ready" | "listening" | "processing";

export interface VoiceSurfaceProps {
  readonly state: VoiceSurfaceState;
  readonly getActivity: () => number;
}

const BASELINE = 0.15;
const CELL = 3;
const PITCH = 5;
const ROWS = 5;

function cellNoise(col: number, row: number): number {
  const value = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function stateLevel(state: VoiceSurfaceState): number {
  switch (state) {
    case "ready":
      return 0.35;
    case "processing":
      return 0.6;
    default:
      return 1;
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  activity: number,
  time: number,
): void {
  ctx.clearRect(0, 0, width, height);
  const columns = Math.max(1, Math.floor(width / PITCH));
  const gridWidth = columns * PITCH - (PITCH - CELL);
  const gridHeight = ROWS * PITCH - (PITCH - CELL);
  const offsetX = Math.max(0, (width - gridWidth) / 2);
  const offsetY = Math.max(0, (height - gridHeight) / 2);
  for (let col = 0; col < columns; col += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const noise = cellNoise(col, row);
      const shimmer =
        0.85 + 0.15 * Math.sin(time * 0.004 + col * 0.55 + row * 0.3);
      ctx.globalAlpha = Math.min(1, BASELINE + activity * noise * shimmer);
      ctx.fillRect(offsetX + col * PITCH, offsetY + row * PITCH, CELL, CELL);
    }
  }
  ctx.globalAlpha = 1;
}

export function VoiceSurface({ state, getActivity }: VoiceSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ink = getComputedStyle(canvas).color || "#ffffff";

    let display = BASELINE;

    const render = (time: number) => {
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const backingWidth = Math.round(cssWidth * dpr);
      const backingHeight = Math.round(cssHeight * dpr);
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.max(
        BASELINE,
        Math.min(1, getActivity() * stateLevel(state)),
      );
      if (target > display) {
        display += (target - display) * 0.5;
      } else {
        display += (BASELINE - display) * 0.05;
      }
      ctx.fillStyle = ink;
      drawFrame(ctx, cssWidth, cssHeight, display, time);
    };

    if (reduce) {
      render(0);
      return;
    }

    let raf = 0;
    const loop = (time: number) => {
      render(time);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [state, getActivity]);

  return <canvas ref={canvasRef} className="flow-ask-global__voice-surface" aria-hidden />;
}
