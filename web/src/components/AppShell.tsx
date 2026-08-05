"use client";

export default function AppShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="app-shell relative flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-none">
      {/* Only this region scrolls — tab bar stays pinned in normal flow (not absolute overlay). */}
      <div className="min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain no-scrollbar">
        <div className="mx-auto w-full max-w-full">{children}</div>
      </div>
      {footer ? (
        <div className="relative z-[70] shrink-0 bg-background">{footer}</div>
      ) : null}
    </div>
  );
}
