export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-stone-50 via-white to-stone-50">
      <div className="mx-auto max-w-lg px-5 pb-12 pt-10">
        {children}
      </div>
    </div>
  );
}
