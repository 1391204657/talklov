export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Full-height shell (no outer scroll / tab padding) so the composer can pin to bottom
  return (
    <div className="app-shell flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-none bg-background text-foreground">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
