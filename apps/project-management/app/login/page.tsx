export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-6">
      <section className="w-full max-w-md rounded-lg border border-[#dde3ea] bg-white p-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#667085]">
          Project Management
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-[#172033]">
          로그인이 필요합니다
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#667085]">
          관리자 앱에 로그인된 세션이 있으면 프로젝트관리 앱에 자동으로
          연결됩니다. 세션이 만료된 경우 관리자 앱에서 다시 로그인해주세요.
        </p>
        <a
          className="mt-6 inline-flex h-10 items-center rounded-md bg-[#2563eb] px-4 text-sm font-medium text-white"
          href={process.env.ADMIN_APP_URL || "http://localhost:3001/login"}
        >
          관리자 로그인으로 이동
        </a>
      </section>
    </main>
  );
}
