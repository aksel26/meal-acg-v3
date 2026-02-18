---
date: 2026-01-30
status: 완료
description: Excel Export 프로그레스 다이얼로그 및 사용자 정산요청 기능 구현
category: Frontend
type: Feature
project: Meal ACG Admin
tags:
  - React
  - Next.js
  - Radix UI
  - JSZip
  - Slack API
---

# Excel Export 프로그레스 다이얼로그 및 정산요청 기능

> Excel Export 시 멤버별 진행 상황을 모달로 표시하고, 사용자 페이지에서 개별 정산요청 발송 기능 구현

## 문제 / 목표

- 기존 Excel 일괄 내보내기는 진행 상황을 알 수 없어 UX가 좋지 않음
- Export한 파일을 Import할 때 "날짜 정보 누락" 경고 발생
- 사용자 페이지의 정산요청 버튼이 placeholder 상태로 미구현

## 해결 과정

### 1. Progress 컴포넌트 생성

`@radix-ui/react-progress` 기반 공유 UI 컴포넌트 추가

```typescript
// packages/ui/src/progress.tsx
<ProgressPrimitive.Indicator
  className="bg-amber-500 h-full w-full flex-1 transition-all"
  style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
/>
```

### 2. ExportProgressDialog 구현

멤버별 순차 API 호출 방식으로 진행 상황 표시

- `useMemo`로 selectedMembers 메모이제이션 (무한 루프 방지)
- `useRef`로 export 시작 여부 추적
- 멤버별 상태: 대기 중 → 처리 중 → 완료/실패
- 1명: xlsx 직접 다운로드, 2명 이상: JSZip으로 ZIP 생성

### 3. Excel Parser 열 인덱스 수정

A열(빈 열)이 xlsx 라이브러리에서 생략되지 않는 문제 해결

```typescript
// 수정 전: A열이 생략된다고 가정
YEAR: 0, MONTH: 1, DAY: 2

// 수정 후: A열 포함
YEAR: 1, MONTH: 2, DAY: 3
```

### 4. 정산요청 기능 구현

Slack API를 통해 개별 사용자에게 DM 발송

- 이메일 등록 사용자: 버튼 활성화 + Slack DM 발송
- 이메일 미등록 사용자: 버튼 비활성화 + Tooltip으로 사유 표시

## 기술 개념 설명

### JSZip

브라우저에서 ZIP 파일을 생성할 수 있는 JavaScript 라이브러리. 서버 없이 클라이언트에서 여러 파일을 하나의 ZIP으로 묶어 다운로드할 수 있다. `dynamic import`로 필요할 때만 로드하여 번들 크기 최적화.

### useRef vs useState

`useRef`는 값이 변경되어도 리렌더링을 트리거하지 않는다. 컴포넌트 생명주기 동안 유지해야 하지만 UI에 영향을 주지 않는 값(예: export 시작 여부)을 추적할 때 유용하다.

### useMemo

의존성 배열의 값이 변경될 때만 계산을 다시 수행한다. `members.filter()`처럼 매 렌더링마다 새 배열을 생성하는 연산을 메모이제이션하여 useEffect의 무한 루프를 방지할 수 있다.

## 변경된 파일

- `packages/ui/src/progress.tsx` (신규)
- `packages/ui/package.json`
- `apps/admin/components/ExportProgressDialog.tsx` (신규)
- `apps/admin/app/(dashboard)/export/page.tsx`
- `apps/admin/app/(dashboard)/users/page.tsx`
- `apps/admin/lib/excel-parser.ts`

## 결과

- Excel Export 시 프로그레스 바와 멤버별 상태 실시간 표시
- Export → Import 시 파싱 경고 해결
- 사용자별 Slack 정산요청 발송 기능 완성
- 이메일 미등록 시 Tooltip으로 사유 안내
