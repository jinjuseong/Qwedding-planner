# Our Wedding 2027 — 결혼 준비 플래너

2027.06.05(토) 12:30 아펠가모 광화문 결혼식 준비용 웹페이지입니다.
`wedding_planner_2027.md` 의 데이터를 기반으로 만들었고, 빌드 없이 GitHub Pages 에 바로 배포됩니다.

화면은 Figma 디자인(Qwedding Planner Figma Design — monthly / total)을 기준으로 구현했습니다.

## 기능
- 월간 캘린더: 이전/다음 달 이동, 오늘(TODAY)·결혼식(WEDDING) 표시, 날짜별 할 일과 담당(신랑·신부·둘이) 배지
- 날짜 칸 클릭 → Monthly 탭이 그 날짜로 필터
- Monthly 탭: D-day, 이번 달 진행률, todo/doing/done 개수, 일·담당·상태 필터, 완료 체크
- Total 탭: 전체 todo/doing/done, 담당·중요도 필터, 월별 그룹 목록
- 카드 펼치기(∨): 설명, 상태·담당·중요도·날짜·비용·업체·예약 링크·메모 편집, 선행/후속 작업 이동, 삭제
- 실내 촬영(WED-011) 카드에서 촬영일 확정 → 6·4·3·2·1주 전 준비 마감일 자동 계산
- + 버튼: 할 일 추가

## 구조
```
index.html
assets/css/style.css    Figma 색·폰트·간격 값 (상단 :root 변수)
assets/img/             Figma에서 내보낸 아이콘 SVG
assets/js/config.js     Supabase 연결 설정
assets/js/store.js      데이터 계층 (로컬 / Supabase)
assets/js/app.js        화면 렌더링·이벤트
data/wedding.json       원본 데이터 (md → JSON)
supabase/schema.sql     DB 스키마 + RLS + 트리거 + 실시간
supabase/seed.sql       초기 데이터 (자동 생성)
scripts/generate-seed.mjs  wedding.json → seed.sql
```

## 동작 모드
| 모드 | 조건 | 저장 위치 |
|---|---|---|
| 로컬 | `config.js` 비어 있음 (기본) | 각자 브라우저 localStorage |
| 공동 편집 | Supabase URL·anon key 설정 | Supabase Postgres, 두 사람 실시간 동기화 |

## 1. GitHub Pages 배포
1. 이 폴더를 GitHub 저장소로 push (`main` 브랜치)
2. 저장소 **Settings → Pages → Source: GitHub Actions**
3. push 할 때마다 `.github/workflows/deploy.yml` 이 자동 배포

## 2. 데이터베이스 (Supabase, 무료 플랜 가능)
1. https://supabase.com 에서 프로젝트 생성
2. `supabase/seed.sql` 의 `bride@example.com`, `groom@example.com` 을 두 사람의 실제 이메일로 수정
3. Dashboard → SQL Editor 에서 `schema.sql` → `seed.sql` 순서로 실행
4. Authentication → URL Configuration 의 Site URL / Redirect URLs 에 GitHub Pages 주소 추가
5. GitHub 저장소 **Settings → Secrets and variables → Actions → Variables** 에
   `SUPABASE_URL`, `SUPABASE_ANON_KEY` 추가 (Project Settings → API 에서 확인) → 재배포

배포 후 페이지에서 이메일 로그인 링크로 접속하면, `project_members` 에 등록된 사람만 읽고 쓸 수 있습니다(RLS).

### 테이블
| 테이블 | 내용 |
|---|---|
| `projects` | 예식일·시간·장소·하객 수·예산 목표·준비 원칙 |
| `project_members` | 공동 편집자 이메일·역할 |
| `confirmed_items` | 확정 완료 항목 |
| `tasks` | 할 일 (md 의 data_model 필드 전체) |
| `task_dependencies` | 선행 작업 관계 |
| `shoots` | 실내/야외 촬영 정보 (예비일 포함) |
| `relative_deadline_rules` | 촬영일 기준 상대 마감 규칙 → 트리거로 tasks.due_date 자동 갱신 |
| `recurring_rules` | 반복 작업 규칙 (RRULE, 단발 작업과 분리) |
| `honeymoon` | 신혼여행 계획 |
| `v_task_blockers`, `v_budget_summary` | 막힌 작업 / 예산 집계 뷰 |

## 데이터 수정
`data/wedding.json` 을 고친 뒤 `node scripts/generate-seed.mjs` 로 `seed.sql` 을 다시 생성합니다.
로컬 모드에서는 브라우저 저장값(localStorage `wedding-planner-2027:v1`)을 지우면 새 JSON 이 반영됩니다.

## 원본 md 대비 추가·해석한 부분
- `WED-045` 실내 촬영 헤어·메이크업 확정, `WED-046` 실내 촬영 최종 점검: 구현 노트의 상대 마감일 규칙(3주 전·1주 전)에 대응하는 작업이 없어 추가. 마감일은 촬영일 확정 전까지 `null`.
- 날짜 미정 항목(`WED-044` 신혼여행 출발 등)은 임의로 확정하지 않고 가안/미정으로 표시.
