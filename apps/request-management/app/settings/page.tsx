export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#172033]">관리</h1>
        <p className="mt-2 text-sm text-[#667085]">
          파일럿 단계에서는 담당자 지정과 마스터 데이터 관리를 수동 운영합니다.
        </p>
      </div>
      <section className="request-panel rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[#172033]">다음 단계</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#667085]">
          <li>파일럿 팀 멤버 매핑</li>
          <li>요청 유형 마스터</li>
          <li>클라이언트 ACL</li>
        </ul>
      </section>
    </div>
  );
}
