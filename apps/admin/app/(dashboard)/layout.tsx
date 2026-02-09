import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f0f2f5]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main className="relative flex h-full flex-1 flex-col overflow-hidden">
        {/* Background blur elements for glass effect */}
        <div className="pointer-events-none absolute -right-[5%] -top-[10%] z-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-[10%] -left-[10%] z-0 h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px]" />

        <Header />

        {/* Content with nice padding and scroll */}
        <div className="z-10 flex-1 overflow-y-auto scroll-smooth px-6 py-4">
          <div className="md:px-2">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
