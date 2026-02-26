# ISLS SaaS (MVP) 데이터 모델 / 권한 설계 초안

## 1) 핵심 원칙

- **Auth는 Supabase Auth**(email/password)로 시작
- 앱 권한은 **profiles.role**(learner/coach/admin)로 제어
- 모든 도메인 테이블은 **cohort_code**(예: `2026-A`)를 기본 분류키로 포함
- 개인정보/성과물 보호를 위해 **RLS(Row Level Security)** 전제로 설계

---

## 2) ERD 개요(텍스트)

```
auth.users (Supabase)
   1 ── 1  profiles
              |
              | 1 ── N enrollments ── 1 modules
              |
              | 1 ── N outputs ── 1 modules
              |
              | 1 ── N mentoring_bookings ── 1 mentoring_slots (coach)
              |
              | 1 ── N alumni_links (requester)
```

---

## 3) 테이블 정의(요약)

### 3.1 profiles
- `id` (uuid, PK) = `auth.users.id`
- `role` (text) : `learner | coach | admin`
- `full_name` (text)
- `cohort_code` (text) : 예 `2026-A`
- `created_at`

### 3.2 modules (LMS 단위)
- `id` (uuid, PK)
- `cohort_code` (text)
- `title` (text)
- `description` (text)
- `content_url` (text) : 외부 LMS/영상 링크
- `sort_order` (int)

### 3.3 enrollments (수강/진도)
- `id` (uuid, PK)
- `user_id` (uuid, FK profiles.id)
- `module_id` (uuid, FK modules.id)
- `status` (text) : `not_started | in_progress | completed`
- `progress` (numeric) : 0~1
- unique(user_id, module_id)

### 3.4 outputs (성과물/제출물)
- `id` (uuid, PK)
- `cohort_code`
- `user_id` (uuid)
- `module_id` (uuid)
- `title` (text)
- `content` (text) : 텍스트 산출물
- `file_path` (text) : Storage 경로(선택)
- `review_status` (text) : `submitted | reviewing | approved | revision_needed`
- `reviewer_id` (uuid, coach/admin)

### 3.5 mentoring_slots (멘토 오픈 슬롯)
- `id` (uuid, PK)
- `coach_id` (uuid)
- `start_at` (timestamptz)
- `end_at` (timestamptz)
- `location` (text) / `meeting_url` (text)
- `capacity` (int)

### 3.6 mentoring_bookings (멘토링 예약)
- `id` (uuid, PK)
- `slot_id` (uuid)
- `learner_id` (uuid)
- `status` (text) : `booked | cancelled | completed`
- `note` (text)

### 3.7 alumni_links (추천/연결)
- `id` (uuid, PK)
- `requester_id` (uuid)
- `target_alumni_id` (uuid)
- `reason` (text)
- `status` (text) : `requested | introduced | rejected | completed`

---

## 4) RLS 정책(핵심만)

- **profiles**
  - 본인 row만 select/update 가능
  - admin은 전체 select 가능

- **modules**
  - 같은 cohort_code의 learner/coach/admin만 select
  - admin만 insert/update/delete

- **outputs**
  - learner는 본인 output만 CRUD
  - coach는 본인 cohort_code 내 output select, 그리고 reviewer 할당된 건 update
  - admin은 전체

- **mentoring_slots / mentoring_bookings**
  - coach는 본인 slot CRUD
  - learner는 slot select + 본인 booking CRUD
  - admin은 전체

---

## 5) 구현 순서(권장)

1) `profiles` 생성 + 트리거로 신규 유저 생성 시 자동 row 생성
2) `modules` & `enrollments`로 LMS 화면 데이터화
3) `outputs`로 Output 탭 실제 제출/피드백 흐름 구현
4) `mentoring_slots/bookings`로 캘린더 예약 구현
5) `alumni_links`로 추천/연결 흐름 구현
