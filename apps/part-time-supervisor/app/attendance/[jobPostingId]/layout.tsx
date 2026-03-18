export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="attendance-layout" className="min-h-dvh bg-stone-950 transition-colors duration-700">
      <div className="mx-auto max-w-lg px-5 pb-12 pt-10">
        {children}
      </div>
    </div>
  );
}
