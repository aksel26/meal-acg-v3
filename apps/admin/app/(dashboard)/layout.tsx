import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import DashboardContentFrame from "@/components/DashboardContentFrame";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell flex h-screen w-full gap-0 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main className="admin-main relative flex h-full flex-1 flex-col overflow-hidden">
        <Header />

        <DashboardContentFrame>{children}</DashboardContentFrame>
      </main>
    </div>
  );
}
