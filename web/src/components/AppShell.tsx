"use client";

/**
 * Shared shell for US and CN — no region branching.
 * Avoid touch-action: pan-y on the scroll parent (breaks taps in some iPhone WebViews).
 */
export default function AppShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="app-shell relative mx-auto flex flex-col bg-background"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
      }}
    >
      <div
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="mx-auto w-full max-w-full">{children}</div>
      </div>
      {footer ? (
        <div className="relative z-[70] shrink-0 bg-surface">{footer}</div>
      ) : null}
    </div>
  );
}
