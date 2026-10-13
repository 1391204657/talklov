"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  src: string;
  images?: string[];
  index?: number;
  onIndex?: (next: number) => void;
  onClose: () => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;

/**
 * Full-screen photo. Scale 1 means the image is at least as wide as the screen.
 * Pinch, wheel, or buttons can zoom in, but not narrower than the screen.
 */
export default function ImageLightbox({
  src,
  images,
  index = 0,
  onIndex,
  onClose,
}: Props) {
  const gallery = images?.length ? images : [src];
  const [i, setI] = useState(Math.min(index, gallery.length - 1));
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const panStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
    over: number;
  } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const suppressClick = useRef(false);
  const [dragX, setDragX] = useState(0);
  const current = gallery[i] || src;

  const panLimits = () => {
    const s = scaleRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = (imgRef.current?.offsetWidth || vw) * s;
    const h = (imgRef.current?.offsetHeight || vh) * s;
    return {
      maxX: Math.max(0, (w - vw) / 2),
      maxY: Math.max(0, (h - vh) / 2),
    };
  };

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const apply = useCallback((s: number, x: number, y: number) => {
    const next = clampScale(s);
    const nx = next <= MIN_SCALE ? 0 : x;
    const ny = next <= MIN_SCALE ? 0 : y;
    scaleRef.current = next;
    txRef.current = nx;
    tyRef.current = ny;
    setScale(next);
    setTx(nx);
    setTy(ny);
  }, []);

  const go = (delta: number) => {
    if (gallery.length <= 1) return;
    const next = (i + delta + gallery.length) % gallery.length;
    setI(next);
    onIndex?.(next);
    apply(1, 0, 0);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // go uses latest index; rebinding on i is enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, i, gallery.length]);

  const touchDist = (
    a: { clientX: number; clientY: number },
    b: { clientX: number; clientY: number }
  ) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const node = (
    <div
      className="fixed inset-0 z-[100] bg-black"
      role="dialog"
      aria-modal
      aria-label="查看照片"
      onClick={stop}
      onPointerDown={stop}
    >
      <div className="absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex items-center justify-between px-3">
        <span className="text-xs text-white/70">
          {gallery.length > 1 ? `${i + 1} / ${gallery.length}` : "照片"}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-lg text-white backdrop-blur"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>

      {gallery.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white"
            aria-label="上一张"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white"
            aria-label="下一张"
          >
            ›
          </button>
        </>
      )}

      <div
        className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden touch-none"
        onClick={(e) => {
          e.stopPropagation();
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          if (scaleRef.current <= MIN_SCALE && !(e.target as HTMLElement).closest("button")) {
            onClose();
          }
        }}
        onWheel={(e) => {
          e.preventDefault();
          const next = clampScale(scaleRef.current * (e.deltaY < 0 ? 1.08 : 0.92));
          apply(next, txRef.current, tyRef.current);
        }}
        onPointerDown={(e) => {
          if (e.button !== 0 || pinchStartDist.current > 0) return;
          panStart.current = {
            x: e.clientX,
            y: e.clientY,
            tx: txRef.current,
            ty: tyRef.current,
            over: 0,
          };
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* pointer already released */
          }
        }}
        onPointerMove={(e) => {
          const start = panStart.current;
          if (!start || pinchStartDist.current > 0) return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          if (scaleRef.current <= MIN_SCALE) {
            start.over = dx;
            setDragX(dx);
            return;
          }
          const { maxX, maxY } = panLimits();
          let nx = start.tx + dx;
          let ny = start.ty + dy;
          let over = 0;
          if (nx > maxX) {
            over = nx - maxX;
            nx = maxX + over * 0.35;
          } else if (nx < -maxX) {
            over = nx + maxX;
            nx = -maxX + over * 0.35;
          }
          ny = Math.min(maxY, Math.max(-maxY, ny));
          start.over = over;
          apply(scaleRef.current, nx, ny);
        }}
        onPointerUp={(e) => {
          const start = panStart.current;
          panStart.current = null;
          setDragX(0);
          if (!start || pinchStartDist.current > 0) return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          if (Math.abs(dx) > 8 || Math.abs(dy) > 8) suppressClick.current = true;
          const horizontal = Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy);
          const atEdge = scaleRef.current <= MIN_SCALE || Math.abs(start.over) > 48;
          if (gallery.length > 1 && horizontal && atEdge) {
            go(dx < 0 ? 1 : -1);
            return;
          }
          const { maxX, maxY } = panLimits();
          apply(
            scaleRef.current,
            Math.min(maxX, Math.max(-maxX, txRef.current)),
            Math.min(maxY, Math.max(-maxY, tyRef.current))
          );
        }}
        onPointerCancel={() => {
          panStart.current = null;
          setDragX(0);
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            pinchStartDist.current = touchDist(e.touches[0], e.touches[1]);
            pinchStartScale.current = scaleRef.current;
            panStart.current = null;
            setDragX(0);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2 && pinchStartDist.current > 0) {
            e.preventDefault();
            const d = touchDist(e.touches[0], e.touches[1]);
            const next = pinchStartScale.current * (d / pinchStartDist.current);
            apply(next, txRef.current, tyRef.current);
          }
        }}
        onTouchEnd={() => {
          pinchStartDist.current = 0;
        }}
      >
        {/* Width is locked to the viewport; scale never goes below 1. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={current}
          alt=""
          draggable={false}
          className="max-w-none select-none"
          style={{
            width: "100vw",
            minWidth: "100vw",
            height: "auto",
            transform: `translate3d(${tx + dragX}px, ${ty}px, 0) scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      </div>

      <div className="absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => apply(scaleRef.current / 1.25, txRef.current, tyRef.current)}
          disabled={scale <= MIN_SCALE}
          className="h-10 w-10 rounded-full bg-white/15 text-lg text-white disabled:opacity-40"
          aria-label="缩小"
        >
          −
        </button>
        <p className="text-xs text-white/70">
          {gallery.length > 1 ? "左右滑动切换 · " : ""}
          双指或滚轮缩放 · 最小为屏幕宽度
        </p>
        <button
          type="button"
          onClick={() => apply(scaleRef.current * 1.25, txRef.current, tyRef.current)}
          disabled={scale >= MAX_SCALE}
          className="h-10 w-10 rounded-full bg-white/15 text-lg text-white disabled:opacity-40"
          aria-label="放大"
        >
          +
        </button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
