"use client";

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
        // iPhone Safari: pan-y on ancestors eats taps; manipulation keeps clicks
        touchAction: "manipulation",
        overflow: "hidden",
      }}
    >
      <div
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto no-scrollbar"
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        <div className="mx-auto w-full max-w-full">{children}</div>
      </div>
      {footer ? (
        <div
          className="relative shrink-0 border-t border-line bg-surface"
          style={{ zIndex: 70, touchAction: "manipulation" }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
