import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden p-3 gap-3">
      <Sidebar />
      <main className="relative flex h-full flex-1 flex-col overflow-hidden rounded-2xl bg-white">
        <Header />
        <div className="flex-1 overflow-y-auto scroll-smooth px-6 py-4">
          {children}
        </div>
      </main>
    </div>
  );
}
