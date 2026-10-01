# 미션 탭 기획

> 상태: **기획만. 구현하지 않음.**  
> 목적: 하단 두 번째 메뉴로 미션을 넣을 때 이 문서를 기준으로 한다.  
> 기준 코드: 2026-10-01 시점의 하단 탭, 포인트 거래, 깃발, 점령, 출석, 크루, 프로필.

---

## 1. 화면 위치

현재 하단 탭은 `components/layout/BottomNav.tsx` 기준 4개다.

| 순서 | 라벨 | 경로 | 로그인 |
|------|------|------|--------|
| 1 | 지도 | `/` | 없음 |
| 2 | 랭킹 | `/ranking` | 없음 |
| 3 | 크루 | `/crew` | 필요 |
| 4 | 마이 | `/my` | 필요 |

미션은 **두 번째**에 넣는다. 순서는 지도, 미션, 랭킹, 크루, 마이다.

- 경로: `/mission`
- 로그인 필요. 비로그인으로 누르면 크루·마이와 같이 로그인 모달을 연다.
- `components/layout/AppShell.tsx`의 메인 탭 목록에 `/mission`을 넣어, 지도 탭을 떠난 동안에도 지도가 유지되게 한다.
- 라벨은 모두 두 글자라 기존 하단 알약 안에 다섯 칸으로 둔다. 아이콘은 기존 탭과 같은 크기(`w-6 h-6`), 글자는 `text-[11px]`.

페이지 상단은 랭킹·크루·마이와 같이 `MainTabHeader`를 쓰고, 본문 하단 여백은 `pb-[calc(6.5rem+var(--safe-bottom))]`로 맞춘다.

---

## 2. 탭

한 화면 안에 탭 네 개.

| 탭 | 주기 | 의미 |
|----|------|------|
| 일간 | 매일 초기화 | 자주 하는 핵심 행동 |
| 주간 | 매주 초기화 | 매일 하기엔 무거운 행동 |
| 월간 | 매월 초기화 | 주간과 같은 종류, 횟수만 큼 |
| 시작하기 | 초기화 없음 | 기능을 한 번씩 경험 |

일간·주간·월간의 하루 경계는 자정이 아니다. 출석과 같은 **KST 오전 9시**를 쓴다. 기준 함수는 `lib/dailyBonus.ts`의 `getLatestDailyResetUtc`다. 출석 보너스(`DAILY_BONUS_RESET_HOUR_KST = 9`)와 "오늘"이 어긋나지 않게 하려는 것이다.

- 일간 키: 가장 최근으로 지난 KST 09:00
- 주간 키: 그 시각이 속한 주의 **월요일 09:00 KST**
- 월간 키: 그 시각이 속한 달의 **1일 09:00 KST**
- 시작하기 키: `once`

기간이 바뀌면 진행 수는 0부터 다시 센다. 지난 기간에 받은 보상은 유지하고, 같은 미션을 새 기간에 다시 받을 수 있다. 시작하기는 계정당 한 번이다.

---

## 3. 카드

미션 한 줄은 아래만 보여 준다.

- 제목, 한 줄 설명
- `현재 / 목표` 횟수
- 진행 막대. 채움 비율은 `min(현재, 목표) / 목표`
- 보상 포인트
- 상태
  - 진행 중: 막대만
  - 달성, 보상 전: 막대 가득 + **받기**
  - 보상 후: **완료** 뱃지. 받기는 사라진다

보상은 자동 지급하지 않는다. 받기를 눌러야 포인트가 들어간다. 달성 순간과 수령을 나누면 중복 지급을 막을 수 있다.

받기는 서버가 진행 수를 다시 계산한 뒤에만 성공한다. 클라이언트에 보이는 횟수는 표시용이다.

---

## 4. 진행 수를 세는 원본

새 이벤트 로그를 만들지 않고, 이미 쌓이는 기록을 기간으로 자른다. 원본이 없는 항목만 예외로 둔다.

| 행동 | 원본 | 세는 법 |
|------|------|---------|
| 포인트 찾기 | `random_points` | `user_id`가 나이고 `created_at`이 기간 안인 행의 **서로 다른 `created_at` 개수**. 찾기 한 번은 `app/api/random-points/spawn/route.ts`에서 포인트 N개를 한 INSERT로 넣는다. 기본 N은 3(`RANDOM_POINT_COUNT`)이라 행 수를 세면 3배가 된다. PostgreSQL `NOW()`는 한 문장 안에서 같으므로 찾기 1회는 `created_at` 1개다. |
| 포인트 얻기 | `point_transactions.type = random_point_claim` | 찾기 포인트를 실제로 주운 횟수. `app/api/random-points/claim/route.ts`가 이 타입을 남긴다. 출석(`daily_bonus`), 통행료(`pin_toll`), 방어(`defense_reward`), 관리자 지급(`admin_adjust`)은 넣지 않는다. |
| 깃발 꽂기 | `point_transactions.type = create_pin` | `app/api/pins/create/route.ts`만 이 타입을 남긴다. 점령 성공도 `pins` 행을 새로 만들지만 `create_pin`이 아니므로 꽂기에 포함하지 않는다. |
| 깃발 강화 | `point_transactions.type = reinforce_pin` | 문구만 바꾸는 `update_pin_text`는 강화가 아니다. |
| 점령 성공 | `pin_attempts.success = true` 이고 `attacker_id`가 나 | |
| 점령 시도 | `pin_attempts`에서 `attacker_id`가 나 | 성공·실패 모두. 시작하기 전용. |
| 출석 | `point_transactions.type = daily_bonus` | 출석은 리셋 구간당 1회다. 기간 안 행 수 = 출석 일수. `profiles.last_daily_bonus_at`은 마지막 한 번만 있어 횟수로 쓸 수 없다. |
| 여러 지역에 꽂기 | `create_pin.related_id`로 `pins.lat/lng`를 찾고 `lib/geo/koreaSigungu.ts`의 `findSigunguByLatLng`로 시군구 코드 | 기간 안 서로 다른 시군구 수. |
| 프로필 이미지 | `profiles.avatar_mime`이 있음 | 시작하기 전용. 이미지 바이트는 `avatar_data`. |
| 크루 들어가기 | `crew_members`에 내 행이 있음 | 가입 신청(`crew_join_requests`)만으로는 완료가 아니다. 승인되어 멤버가 된 뒤다. |

`user_region_visits`는 쓰지 않는다. 그 테이블은 사용자·시군구당 `first_visited_at`과 누적 `pin_count`만 있어서, 이번 주·이번 달에 새로 꽂은 지역 수를 가를 수 없다.

지역 미션의 좌표는 `create_pin` 거래의 `related_id`가 가리키는 깃발이다. 점령으로 생긴 깃발은 지역 수에 넣지 않는다.

---

## 5. 미션 목록

횟수와 보상은 현재 경제에 맞춘 **초안**이다. 구현 전에 숫자만 바꿔도 구조는 유지한다.

참고한 현재 값:

- 출석 보너스 10P (`DAILY_BONUS_AMOUNT`)
- 깃발 꽂기·강화 각 100P
- 포인트 찾기 획득값 10 / 20 / 30 / 50 / 100P
- 찾기 재사용 대기 기본 10분, 한 번에 3개

일간 보상은 그 행동의 본 보상보다 작게 둔다. 미션이 포인트의 주 수입이 되지 않게 하려는 것이다.

### 일간

| id | 제목 | 목표 | 보상 |
|----|------|------|------|
| `daily_find_point` | 포인트 찾기 | 1 | 10P |
| `daily_claim_point` | 포인트 얻기 | 1 | 10P |
| `daily_plant_pin` | 깃발 꽂기 | 1 | 20P |

찾기 1회로 둔 이유: 재사용 대기가 10분이라, 하루에 여러 번을 목표로 두면 대기 시간이 미션이 된다.

### 주간

| id | 제목 | 목표 | 보상 |
|----|------|------|------|
| `weekly_conquer` | 다른 사람 깃발 점령 성공 | 1 | 50P |
| `weekly_reinforce` | 깃발 강화 | 1 | 30P |
| `weekly_regions` | 서로 다른 지역에 깃발 꽂기 | 2곳 | 50P |
| `weekly_attendance` | 출석 | 5 | 30P |

### 월간

| id | 제목 | 목표 | 보상 |
|----|------|------|------|
| `monthly_conquer` | 다른 사람 깃발 점령 성공 | 3 | 150P |
| `monthly_reinforce` | 깃발 강화 | 3 | 80P |
| `monthly_regions` | 서로 다른 지역에 깃발 꽂기 | 5곳 | 150P |
| `monthly_attendance` | 출석 | 15 | 80P |

주간 출석 5는 월~일 7일 중 5일이다. 월간 15는 한 달의 약 절반이다. 9시 경계 때문에 달력 날짜 수와 출석 가능 횟수가 하루 어긋날 수 있다. 목표는 그 기간에 실제로 열릴 수 있는 출석 횟수보다 작게 유지한다.

### 시작하기

계정당 한 번. 출시 전에 이미 한 행동도 완료로 인정한다. 처음 탭을 열었을 때 과거 기록으로 진행 수가 채워져 있어야 한다.

| id | 제목 | 완료 조건 | 보상 |
|----|------|-----------|------|
| `start_avatar` | 프로필 이미지 추가 | `avatar_mime` 있음 | 20P |
| `start_plant` | 깃발 꽂기 | `create_pin` 1회 이상 | 20P |
| `start_reinforce` | 깃발 강화 | `reinforce_pin` 1회 이상 | 20P |
| `start_find` | 포인트 찾기 | 찾기 1회 이상 | 10P |
| `start_claim` | 포인트 얻기 | `random_point_claim` 1회 이상 | 10P |
| `start_crew` | 크루 들어가기 | `crew_members`에 있음 | 30P |
| `start_conquer` | 점령하기 | `pin_attempts` 1회 이상. 실패도 완료 | 30P |

점령은 성공만 요구하지 않는다. 시작하기의 목적은 기능을 한 번 써 보는 것이고, 실패해도 점령 화면과 확률 선택은 경험한 것이다.

시작하기 보상 합은 140P다. 가입 보너스 1000P(`INITIAL_POINTS`)보다 작게 두었다.

---

## 6. 보상 저장

진행 수는 원본을 집계하고, **수령 사실만** 따로 저장한다.

`mission_claims`

- `user_id`
- `mission_id`
- `period_key` (일간·주간·월간은 그 기간의 시작 시각 ISO, 시작하기는 `once`)
- `points`
- `created_at`
- unique `(user_id, mission_id, period_key)`

받기 처리:

1. 로그인 사용자만
2. `mission_id`가 목록에 있는지
3. 그 `period_key`가 서버 시각 기준 현재 기간과 같은지. 지난 기간 미수령은 받지 못한다
4. 원본을 다시 세어 목표 이상인지
5. unique 제약으로 한 번만 insert
6. `addPoints(..., "mission_reward", ...)`

`point_transactions.type` 체크에 `mission_reward`를 추가한다. 현재 허용 타입은 `supabase/migrations/034_pin_text_change.sql` 기준 `signup_bonus`, `create_pin`, `reinforce_pin`, `update_pin_text`, `conquer_attempt`, `random_point_claim`, `admin_adjust`, `daily_bonus`, `defense_reward`, `crew_create`, `pin_toll`이다.

지급 실패 시 claim 행을 남기지 않는다. insert와 포인트 지급이 어긋나면 같은 기간에 두 번 받을 수 있으므로, 지급 실패면 claim을 지우고 포인트를 되돌린다. `lib/pins.ts`의 `addPoints`는 거래 기록 실패 시 잔액을 되돌린다. claim insert는 그 성공 뒤에 두거나, 실패 시 claim을 삭제한다.

관리자 지급·미션 보상은 누적 포인트 랭킹에서 빼는 기존 방향(`034_exclude_admin_adjust_from_earned.sql`)을 따른다. `mission_reward`도 누적 획득 랭킹 합계에서 제외한다.

---

## 7. API

- `GET /api/missions`  
  네 탭의 미션, 현재 수, 목표, 보상, 수령 여부, 현재 `period_key`.
- `POST /api/missions/claim`  
  body `{ missionId }`. 성공 시 새 잔액과 그 미션의 수령 상태.

목록과 정의(제목, 목표, 보상, 집계 종류)는 서버 한곳에 둔다. 클라이언트는 그 응답만 그린다.

---

## 8. 구현 순서

1. `mission_reward` 타입과 `mission_claims`, 랭킹 합계에서 제외
2. 기간 키와 집계 함수. 일간 출석 경계 재사용
3. `GET /api/missions`, `POST /api/missions/claim`
4. `/mission` 페이지와 하단 두 번째 탭, `AppShell` 탭 목록
5. 카드 UI: 막대, 받기, 완료 뱃지

집계 함수는 미션 id별로 원본 쿼리를 고정한다. 화면에서 횟수를 더하지 않는다.

---

## 9. 하지 않는 것

- 미션 완료 푸시. 알림 종류를 늘리지 않는다. 완료는 탭 안에서만 보여 준다.
- 연속 출석 보너스, 랭킹 점수, 크루 공동 미션
- 운영자가 앱 업데이트 없이 미션 문구·횟수를 바꾸는 관리 화면. 초안은 코드의 목록으로 둔다
- `user_region_visits`로 기간 지역 수를 세는 것
- 포인트 얻기에 통행료·방어·출석·관리자 지급을 포함하는 것
