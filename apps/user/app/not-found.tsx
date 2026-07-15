import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-white to-slate-50">
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
          className="mb-6 drop-shadow-lg"
          style={{ animation: "wiggle 0.8s steps(2, jump-both) infinite" }}
          priority
        />

        <p className="text-6xl font-extrabold text-slate-200 mb-2">404</p>

        <h1 className="text-lg font-bold text-slate-800 mb-2">
          앗, 여긴 어디지...?
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-8">
          찾으시는 페이지가 밥 먹으러 간 것 같아요.
          <br />
          아래 버튼을 눌러 홈으로 돌아가 주세요!
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 active:scale-[0.97] transition-all shadow-md"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
