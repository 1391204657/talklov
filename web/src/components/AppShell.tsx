"use client";

export default function AppShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="app-shell flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-none">
      {/* Only this region scrolls — tab bar stays pinned; pan-y locks sideways drag */}
      <div className="min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain no-scrollbar">
        <div className="mx-auto w-full max-w-full pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
      {footer ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40">
          <div className="pointer-events-auto">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}
