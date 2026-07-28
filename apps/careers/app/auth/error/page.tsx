const ADMIN_SSO_URL = new URL(
  "/api/auth/sso/careers",
  process.env.ADMIN_APP_URL || "http://localhost:3001",
).toString();

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <section className="careers-panel w-full p-8 text-center">
        <span className="mx-auto flex size-10 items-center justify-center rounded-lg bg-[#1d1d1f] text-[11px] font-semibold tracking-[0.08em] text-white">
          ACG
        </span>
        <h1 className="mt-5 text-[21px] font-semibold tracking-[-0.02em]">
          인증할 수 없습니다
        </h1>
        <p className="mt-2 text-sm text-[#7a7a7a]">
          관리자 권한을 확인한 뒤 다시 접속해주세요.
        </p>
        <a
          href={ADMIN_SSO_URL}
          className="careers-interactive mt-6 inline-flex min-h-9 items-center rounded-lg bg-[#1d1d1f] px-4 py-2 text-sm font-medium text-white hover:bg-black/85"
        >
          관리자 앱에서 다시 인증
        </a>
      </section>
    </main>
  );
}
