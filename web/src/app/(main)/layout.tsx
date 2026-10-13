import TabBar from "@/components/TabBar";
import AppShell from "@/components/AppShell";
import RequireProfilePhoto from "@/components/RequireProfilePhoto";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell footer={<TabBar />}>
      <RequireProfilePhoto />
      {children}
    </AppShell>
  );
}
