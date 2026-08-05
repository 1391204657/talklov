"use client";

/**
 * Same shell for US and CN.
 * Uses document scroll + fixed tab bar — nested overflow:hidden/100dvh shells
 * were eating taps on some iPhone Safari sessions while /diag (no shell) worked.
 */
export default function AppShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="app-shell relative mx-auto flex min-h-dvh flex-col bg-background">
      <div
        className="flex-1"
        style={{
          paddingBottom: footer
            ? "calc(4.25rem + env(safe-area-inset-bottom))"
            : undefined,
        }}
      >
        {children}
      </div>
      {footer ? (
        <div className="fixed inset-x-0 bottom-0 z-[70]">
          <div className="mx-auto w-full max-w-[480px] border-t border-line bg-surface">
            {footer}
          </div>
        </div>
      ) : null}
    </div>
  );
}
