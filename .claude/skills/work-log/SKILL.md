---
name: dev-log-writer
description: 개발 기록을 Obsidian 형식의 마크다운으로 작성하고 Obsidian MCP를 통해 업로드. 사용자가 개발 작업 내용, 커밋 로그, 기술 스택 정보를 제공하면 frontmatter 메타데이터와 기술 개념 설명이 포함된 체계적인 개발 문서 생성. "개발 기록", "작업 로그", "TIL", "개발 일지" 작성 요청 시 트리거.
---

# Dev Log Writer

개발 기록을 Obsidian 호환 마크다운으로 작성하고 Obsidian vault에 저장하는 스킬.

## Workflow

### 1. 입력 분석

사용자 입력에서 추출할 정보:

- 해시태그: `#React`, `#TypeScript` 등 → tags 배열
- 프로젝트명: `#MealACG`, `#Blog` 등 → project 필드
- 작업 유형: Feature, Bug Fix, Refactor, Documentation, Config

### 2. Frontmatter 생성

```yaml
---
date: YYYY-MM-DD # 오늘 날짜
status: 완료|진행중|보류 # 기본값: 완료
description: string # 한 줄 요약 (blockquote에서 추출)
category: Frontend|Backend|Infra|DevOps
type: Feature|Bug Fix|Refactor|Documentation|Config
project: string # 프로젝트명
tags:
  - tag1
  - tag2
---
```

### 3. 본문 구조

```markdown
# 제목

> 한 줄 요약 (description과 동일)

## 문제 / 목표

- 해결하려는 문제 또는 구현 목표

## 해결 과정

### 1. 첫 번째 단계

- 상세 내용

## 기술 개념 설명

### 개념명

개념에 대해서 쉽고 상세한 설명. 코드 예시 포함 가능.

## 변경된 파일

- `path/to/file.ts`

## 결과

- 성과 요약
```

### 4. 문체 및 작성 스타일

**서술형 문체 사용:**

- '~합니다', '~했습니다', '~됩니다' 형태의 서술형으로 작성합니다.
- 예시:
  - ❌ "버그 수정" → ✅ "버그를 수정했습니다"
  - ❌ "컴포넌트 추가" → ✅ "컴포넌트를 추가했습니다"
  - ❌ "문제 발생" → ✅ "문제가 발생했습니다"

### 5. 기술적 심층 분석 작성 규칙

버그 수정이나 문제 해결 시, 다음 구조로 기술적인 내용을 심층적으로 다룹니다:

**문제 분석:**

```markdown
## 문제 분석

### 증상

- 사용자에게 보이는 실제 증상을 구체적으로 기술합니다.
- 에러 메시지가 있다면 정확히 기록합니다.

### 원인 파악

- 코드 레벨에서 문제의 근본 원인을 분석합니다.
- 관련 함수, 변수, 로직 흐름을 명시합니다.
- 예시: "Excel 파서에서 열 인덱스가 0-based가 아닌 1-based로 처리되어 데이터가 한 칸씩 밀려서 파싱되었습니다."
```

**해결 과정:**

```markdown
## 해결 과정

### 1. 디버깅 과정

- 문제를 추적하기 위해 사용한 방법을 설명합니다.
- console.log, 브레이크포인트, 네트워크 탭 분석 등 구체적인 디버깅 기법을 기록합니다.

### 2. 시도한 방법들

- 해결을 위해 시도했던 접근 방식들을 순서대로 나열합니다.
- 실패한 시도도 포함하여 왜 실패했는지 기록합니다.

### 3. 최종 해결 방법

- 실제로 문제를 해결한 코드 변경사항을 구체적으로 작성합니다.
- before/after 코드 비교를 포함합니다.

\`\`\`typescript
// Before: 문제가 있던 코드
const value = row[columnIndex]; // 잘못된 인덱스

// After: 수정된 코드
const value = row[columnIndex - 1]; // 0-based 인덱스로 수정
\`\`\`
```

**결과 및 검증:**

```markdown
## 결과

### 수정 결과

- 수정 후 정상 동작하는 것을 확인했습니다.
- 구체적인 테스트 케이스와 결과를 기록합니다.

### 학습한 점

- 이 문제를 통해 배운 기술적 인사이트를 정리합니다.
- 향후 유사한 문제를 예방하기 위한 방법을 제시합니다.
```

### 6. 기술 개념 설명 작성 규칙

사용자 입력에 기술 용어가 등장하면 "기술 개념 설명" 섹션에 추가합니다:

- 각 개념당 2-4문장으로 서술형으로 설명합니다.
- 가능하면 코드 예시를 포함합니다.
- 프론트엔드 개발자 관점에서 실용적인 설명을 작성합니다.

자동 감지 키워드 예시:

- `bcrypt`, `JWT`, `OAuth` → 인증/보안 개념
- `RPC`, `UPSERT`, `트랜잭션` → DB 개념
- `SSR`, `CSR`, `ISR` → 렌더링 개념
- `Zustand`, `Redux`, `Context` → 상태관리 개념
- `AnimatePresence`, `stagger` → 애니메이션 개념

### 7. Obsidian 저장

Obsidian MCP `create` 또는 `patch` 도구 사용:

```
도구: create
경로: /HMKIM/DailyLog/{제목}.md
내용: 생성된 마크다운
```

파일명 규칙:

- 한글 제목 사용 가능
- 공백은 그대로 유지
- 특수문자 제거: `/ \ : * ? " < > |`

## Project Mapping

| 키워드              | project 값                        |
| ------------------- | --------------------------------- |
| MealACG, 식대, meal | Meal ACG User 또는 Meal ACG Admin |
| Blog, 블로그, hmkim | Blog                              |
| (그 외)             | 사용자에게 확인                   |

## Type Mapping

| 키워드              | type 값       |
| ------------------- | ------------- |
| 기능, feat, feature | Feature       |
| 버그, fix, bug      | Bug Fix       |
| 리팩토링, refactor  | Refactor      |
| 문서, docs          | Documentation |
| 설정, config, CI    | Config        |

## Category Mapping

| 키워드                         | category 값 |
| ------------------------------ | ----------- |
| React, Next, Vue, UI, 컴포넌트 | Frontend    |
| API, Supabase, DB, 서버        | Backend     |
| Docker, AWS, Vercel            | Infra       |
| GitHub Actions, CI/CD          | DevOps      |
