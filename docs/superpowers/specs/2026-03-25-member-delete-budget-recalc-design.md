# 인원 삭제 시 활동비 자동 재계산

## 배경

활동비는 팀 인원 수 기반으로 계산된다. 인원이 삭제되면 저장된 budget_allocations 금액이 실제 인원과 불일치하게 된다. 현재는 수동으로 "활동비 자동 계산" 버튼을 다시 눌러야만 반영되며, 인턴의 경우 삭제하면 데이터가 사라져 실제 근무 개월을 반영할 수 없다.

## 트리거 조건

| 삭제 대상 | 동작 |
|-----------|------|
| **인턴** | 근무 개월 입력 다이얼로그 -> 해당 팀장 활동비 재계산 + P&C팀장 재계산 |
| **팀원** | 해당 팀장 활동비 재계산 + P&C팀장 재계산 |
| **팀장** | 재계산 없음 (budget_allocation CASCADE 삭제) |

## 인턴 삭제 플로우

1. 삭제 버튼 클릭
2. 다이얼로그 표시: "이 인턴의 실제 근무 개월을 입력하세요"
   - 기본값: 기존 `intern_months` 값
   - 사용자가 수정 가능
3. 확인 클릭
4. `intern_months`를 입력값으로 업데이트
5. 활동비 재계산 (해당 팀장 + P&C팀장)
6. `budget_allocations` 업데이트
7. 인턴 삭제

## 팀원 삭제 플로우

1. 기존 삭제 확인 다이얼로그
2. 확인 클릭
3. 활동비 재계산 (해당 팀장 + P&C팀장)
4. `budget_allocations` 업데이트
5. 팀원 삭제

## 재계산 로직

- 기존 `calculate_activity_budget` RPC 활용
- 삭제 대상을 제외한 인원으로 계산
- 현재 기간(`period`)의 활동비 allocation만 대상
- 재계산 대상:
  - 삭제 대상이 속한 팀의 팀장
  - P&C팀장 (pncExtraCount 변동 반영)

## 수동 수정

재계산 후에도 budget 페이지에서 금액을 직접 수정할 수 있음 (기존 기능 유지).

## 영향 범위

- `apps/admin/app/api/members/[id]/route.ts` - DELETE 핸들러에 재계산 로직 추가
- `apps/admin/components/` - 인턴 삭제 시 근무 개월 입력 다이얼로그 추가
- `apps/admin/app/api/budget-allocations/calculate/route.ts` - 개별 멤버 재계산 지원
- 조직원 현황 페이지의 삭제 UI 수정
