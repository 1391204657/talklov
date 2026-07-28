"use client";

export default function AppShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar">
        {children}
      </div>
      {footer}
    </div>
  );
}
