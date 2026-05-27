# Admin Privacy Operations Guide

이 문서는 어드민 앱에서 직원 개인정보와 민감정보를 다룰 때 개발자와 운영자가 지켜야 할 최소 운영 기준이다. 목적은 개발 편의보다 운영 데이터 접근 통제를 우선하고, 필요한 접근은 승인과 감사 로그가 남도록 만드는 것이다.

## 원칙

- 개발자는 운영 DB에 상시 접속하지 않는다.
- 개발/테스트는 로컬 Supabase 또는 별도 개발 DB의 샘플 데이터로 수행한다.
- 운영 데이터는 대표 또는 P&C 책임자의 승인 없이 개발 DB로 복제하지 않는다.
- 장애 대응 등 예외 접근은 시간 제한, 사유, 승인자, 작업자를 남긴다.
- 엑셀 다운로드와 민감정보 조회는 필요한 사람에게만 허용하고 감사 로그를 확인한다.

## 환경 분리

| 환경 | 용도 | 데이터 기준 | 접근 권한 |
| --- | --- | --- | --- |
| Local | 개발자 개인 개발 | seed 또는 임의 샘플 데이터 | 개발자 |
| Staging | 배포 전 검증 | 마스킹된 테스트 데이터 | 개발자, 관리자 |
| Production | 실제 운영 | 실제 직원 데이터 | 대표/P&C 승인자, 제한된 운영자 |

운영 데이터를 staging으로 복제해야 할 때는 이름, 전화번호, 생년월일, 여권번호, 급여, 계좌 등 식별 가능 값을 먼저 마스킹한다.

## 운영 접근 절차

운영 DB 또는 service role key 접근은 다음 조건을 모두 만족해야 한다.

1. 접근 목적과 대상 테이블을 기록한다.
2. 대표 또는 P&C 책임자가 승인한다.
3. 접근 시간을 제한한다.
4. 작업 후 접근 권한 또는 임시 키를 회수한다.
5. 수행한 조회, 다운로드, 변경 내역을 감사 로그 또는 작업 기록에 남긴다.

권한 회수까지 완료되지 않은 작업은 완료로 보지 않는다.

## 마이그레이션 적용 절차

로컬 검증:

```bash
supabase status
supabase migration up
pnpm --filter admin check-types
pnpm --filter admin build
```

마이그레이션 히스토리가 맞지 않아 `supabase migration up`이 실패하면 임의로 repair하지 않는다. 실제 운영 적용 전에는 누락된 migration 버전과 적용 상태를 확인하고, 유지보수 담당자가 migration history repair 여부를 결정한다.

운영 적용 전 체크리스트:

- 최신 운영 DB 백업을 확보했다.
- 적용할 migration 파일 목록을 확정했다.
- rollback 또는 복구 절차를 문서화했다.
- 업무 영향 시간이 낮은 배포 창을 정했다.
- 적용 후 확인할 API, 화면, RPC를 정했다.

이번 개인정보 강화 작업의 필수 DB 객체:

- `public.admin_audit_logs`
- `public.authenticate_user(text,text)`
- `public.change_member_password(uuid,text,text)`
- `public.hash_member_password()`
- `public.trg_hash_member_password`

## 비밀값 관리

- service role key는 서버 환경 변수에만 둔다.
- 클라이언트 번들, 문서, 스크린샷, 이슈, 메신저에 service role key를 남기지 않는다.
- 운영 DB URL과 service role key는 개발자 개인 `.env`로 배포하지 않는다.
- 키가 노출됐다고 판단되면 즉시 교체하고 접근 로그를 확인한다.

## 감사 로그 확인

어드민 앱의 `감사 로그` 화면 또는 `/api/admin-audit-logs` API에서 다음 작업을 정기적으로 확인한다.

- `member.sensitive_view`
- `member.export_single`
- `member.export_bulk`
- `member.export_excel`
- `usage_records.export_excel`
- `member.permission_update`

반복 조회, 대량 다운로드, 업무 시간 외 접근이 있으면 접근 사유와 승인 여부를 확인한다.

## 완료 기준

- 기본 직원 조회 API가 비밀번호, 여권번호, 생년월일, 전화번호를 반환하지 않는다.
- 민감정보 조회는 별도 권한과 사유가 필요하다.
- 엑셀 다운로드와 권한 변경은 감사 로그가 남는다.
- 비밀번호는 DB에 bcrypt 해시로 저장된다.
- 운영 DB 접근은 승인, 시간 제한, 회수, 기록 절차를 따른다.
