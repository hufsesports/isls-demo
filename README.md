# ISLS WebApp MVP (Vite + React + Supabase + PWA)

이 프로젝트는 업로드해주신 **ISLS SaaS Mock-up HTML**을 기반으로,

- 웹/모바일 반응형
- SPA 라우팅
- PWA(홈 화면 추가)
- Supabase(Auth + Postgres + RLS)

까지 포함한 “즉시 퍼블리싱 가능한” DB 연동 MVP입니다.

## 실행

```bash
npm install
npm run dev
```

## Supabase 연결(로그인/권한/DB)

아래 순서를 **그대로** 진행하면 됩니다.

### 0) 준비물
- Supabase 계정
- Node.js 18+ (권장)

### 1) Supabase 프로젝트 생성
1. Supabase Dashboard → **New project**
2. 생성 완료 후 좌측 메뉴에서 **Project Settings → API**로 이동
   - `Project URL`
   - `anon public key`
   두 값을 잠시 복사해 둡니다.

### 2) DB 스키마/권한(RLS) 생성
Supabase Dashboard → **SQL Editor**

1. New query
2. `supabase/sql/init.sql` 내용을 전체 붙여넣기
3. **Run**

> 이미 v1(init.sql)을 실행한 프로젝트라면 `supabase/sql/upgrade_from_v1.sql`을 먼저 참고하세요.

### 3) (선택) 샘플 데이터 넣기
SQL Editor에서 `supabase/sql/seed.sql` 실행
- cohort `2026-A` 모듈 3개
- Alumni 디렉토리 샘플 3명

### 4) Authentication 설정
Supabase Dashboard → **Authentication**

- Providers → Email: Enabled 확인
- URL Configuration
  - Site URL: `http://localhost:5173`
  - Redirect URLs: `http://localhost:5173/*`

### 5) 프론트 환경변수(.env) 설정
프로젝트 루트에서 `.env.example`을 `.env`로 복사 후 값 입력

```bash
VITE_SUPABASE_URL=Project_URL
VITE_SUPABASE_ANON_KEY=anon_public_key
```

저장 후 개발 서버 재시작:

```bash
npm run dev
```

### 6) 테스트 유저 생성 + role/cohort 세팅(필수)
1. 브라우저에서 `/#/login` → 회원가입(Email/Password)
2. Supabase Dashboard → **Table Editor → profiles**
3. 방금 생성된 유저 row에서 아래를 설정
   - `cohort_code`: 예) `2026-A`
   - `role`: 기본 `learner`

#### 권장 테스트 구성
- Learner 계정 1개: `role=learner, cohort_code=2026-A`
- Coach 계정 1개: `role=coach, cohort_code=2026-A`
- Admin 계정 1개: `role=admin` (cohort는 없어도 되지만 넣어도 OK)

---

## 기능별 동작 확인(페이지별)

### LMS (`/#/lms`)
- `modules` (cohort별) 조회
- `enrollments` (내 진도) upsert

> LMS가 비어있다면 99% `profiles.cohort_code`가 비어 있거나, seed.sql을 아직 안 넣은 경우입니다.

### Output (`/#/output`)
- `outputs` 생성/조회/상태 변경
- Draft(작성) → Review(리뷰 요청/진행) → Final(승인)

### Mentoring (`/#/mentoring`)
- `mentoring_slots`(슬롯) 조회
- `mentoring_bookings`(예약) 생성/취소

> 슬롯은 Coach가 먼저 만들어야 Learner가 예약할 수 있습니다.

### Alumni (`/#/alumni`)
- `alumni_directory` 조회
- `alumni_links` 소개 요청 생성

### Coach (`/#/coach`)  ※ role=coach/admin
- Output 리뷰 대기 목록 확인
- Claim & Start(리뷰어 할당) → Revision/Approve
- Mentoring 슬롯 생성

### Admin (`/#/admin`)  ※ role=admin
- 전체 지표(간단)
- Users Top 50: role/cohort_code 수정

---

## 배포(정적 호스팅)

```bash
npm run build
```

`dist/` 폴더를 Netlify/Vercel/기관 서버에 업로드하면 됩니다.

> 라우팅은 HashRouter(`/#/...`)라 서버 리라이트 설정 없이도 동작합니다.

## 라우팅
- `/#/home`
- `/#/login`
- `/#/lms`
- `/#/output`
- `/#/mentoring`
- `/#/alumni`
- `/#/coach`
- `/#/admin`

## 다음 단계(프로덕션 고도화)
- Storage(성과물 파일 업로드), 버전관리
- 멘토링 capacity(정원) 처리
- 알림(메일/푸시), 감사로그
- Admin 대시보드 고도화(코호트별 KPI)
- 결제/구독(필요 시)

## 문서
- `docs/erd.md` : 데이터 모델/권한(RLS) 초안

