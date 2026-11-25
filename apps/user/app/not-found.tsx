import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-white to-gray-50">
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(6deg); }
        }
      `}</style>
      <div className="flex flex-col items-center text-center max-w-sm">
        <Image
          src="/images/meal-sticker.webp"
          alt="길을 잃은 주먹밥"
          width={180}
          height={180}
          className="mb-6 drop-shadow-lg motion-safe:animate-[wiggle_0.8s_steps(2,jump-both)_infinite]"
          priority
        />

        <p className="text-6xl font-extrabold text-[var(--slate-gray)] mb-2">404</p>

        <h1 className="text-lg text-[var(--ink-black)] mb-2">
          앗, 여긴 어디지...?
        </h1>
        <p className="text-sm text-[var(--slate-gray)] leading-relaxed mb-8">
          찾으시는 페이지가 밥 먹으러 간 것 같아요.
          <br />
          아래 버튼을 눌러 홈으로 돌아가 주세요!
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-[var(--ink-black)] hover:bg-[var(--granite)] active:scale-[0.96] transition-[scale,background-color] shadow-md"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
