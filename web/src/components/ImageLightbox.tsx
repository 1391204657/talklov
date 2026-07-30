"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  onClose: () => void;
};

/**
 * Full-screen image viewer. Scale starts at 1 = cover the screen;
 * pinch / wheel can zoom in, but not below full-screen cover.
 */
export default function ImageLightbox({ src, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(
    null
  );

  const clampScale = (s: number) => Math.min(4, Math.max(1, s));

  const apply = useCallback((s: number, x: number, y: number) => {
    const next = clampScale(s);
    // Reset pan when back to cover
    const nx = next <= 1 ? 0 : x;
    const ny = next <= 1 ? 0 : y;
    scaleRef.current = next;
    txRef.current = nx;
    tyRef.current = ny;
    setScale(next);
    setTx(nx);
    setTy(ny);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const touchDist = (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) => {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };

  return (
    <div
      className="fixed inset-0 z-[80] touch-none bg-black"
      role="dialog"
      aria-modal
      aria-label="查看图片"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg text-white backdrop-blur"
        aria-label="关闭"
      >
        ✕
      </button>

      <div
        className="flex h-full w-full items-center justify-center overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget && scaleRef.current <= 1) onClose();
        }}
        onWheel={(e) => {
          e.preventDefault();
          const next = clampScale(scaleRef.current * (e.deltaY < 0 ? 1.08 : 0.92));
          apply(next, txRef.current, tyRef.current);
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            pinchStartDist.current = touchDist(e.touches[0], e.touches[1]);
            pinchStartScale.current = scaleRef.current;
            panStart.current = null;
          } else if (e.touches.length === 1) {
            panStart.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
              tx: txRef.current,
              ty: tyRef.current,
            };
          }
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          if (e.touches.length === 2 && pinchStartDist.current > 0) {
            const d = touchDist(e.touches[0], e.touches[1]);
            const next = pinchStartScale.current * (d / pinchStartDist.current);
            apply(next, txRef.current, tyRef.current);
          } else if (e.touches.length === 1 && panStart.current && scaleRef.current > 1) {
            const dx = e.touches[0].clientX - panStart.current.x;
            const dy = e.touches[0].clientY - panStart.current.y;
            apply(
              scaleRef.current,
              panStart.current.tx + dx,
              panStart.current.ty + dy
            );
          }
        }}
        onTouchEnd={() => {
          pinchStartDist.current = 0;
          panStart.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="h-full w-full select-none object-cover"
          style={{
            transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
            transformOrigin: "center center",
            transition: pinchStartDist.current ? "none" : undefined,
          }}
        />
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-white/60">
        双指缩放 · 最小满屏
      </p>
    </div>
  );
}
