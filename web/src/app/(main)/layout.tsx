import TabBar from "@/components/TabBar";
import AppShell from "@/components/AppShell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell footer={<TabBar />}>
      {children}
    </AppShell>
  );
}
