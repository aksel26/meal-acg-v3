import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden p-3 gap-3">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main className="relative flex h-full flex-1 flex-col overflow-hidden rounded-2xl bg-white">
        <Header />

        {/* Content with nice padding and scroll */}
        <div className="flex-1 overflow-y-auto scroll-smooth px-6 py-4">
          <div className="md:px-2">{children}</div>
        </div>
      </main>
    </div>
  );
}
