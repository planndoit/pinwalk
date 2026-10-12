# 깃발 수확 · 공지 팝업 기획

> 상태: **기획만. 구현하지 않음.**  
> 목적: 깃발에 시간이 지나면서 포인트가 쌓이는 기능과 운영 공지(로그인 팝업, 알림 공지 탭, 관리자 공지 관리)를 이 문서를 기준으로 구현한다.  
> 기준 코드: 2026-10-12 `master` (`97d7f76`). 마이그레이션 마지막 번호는 `041`.

---

## 0. 요청 요약

1. 매시 정각마다 깃발 투자 포인트(`pins.cost`)의 1%가 깃발에 쌓인다. ~~가득 차는 한도는 투자 포인트와 같다(100시간).~~ → **한도는 24시간치(투자 포인트의 24%)로 변경** (2026-10-12, 12장). 목적은 사용자가 하루에 한 번은 들어오게 하는 것이다.
2. 쌓인 포인트를 받는 방법은 두 가지다.
   - 깃발에 직접 가서 받기: 전액
   - 멀리서 받기: 쌓인 포인트의 10%만 받고 나머지는 사라짐
3. 멀리서 받기는 깃발 하나씩, 또는 모든 깃발을 한 번에 할 수 있다.
4. 점령당한 깃발에 쌓여 있던 포인트는 사라지지 않고 새 주인에게 넘어간다.
5. 출석 처리 시 전체 깃발에 쌓인 포인트를 보여 주고 전체 멀리서 받기를 제안한다. 10%만 받고 나머지가 사라진다는 점을 분명히 알린다.
6. 업데이트 공지를 로그인 시 팝업으로 띄운다. 관리자가 공지를 작성·공개할 수 있다. "오늘 하루 보지 않기", "다시 보지 않기"를 둔다.
7. 알림 화면에 **공지** 탭을 추가해 지난 공지를 모아 보고, 누르면 같은 팝업으로 다시 본다.
8. 새 기능은 이용 가이드에도 반영한다.
9. 새 기능이 생기면 설명 공지를 관리자 공지의 **비공개 초안**으로 함께 만들어 둔다. 운영자는 내용을 확인한 뒤 공개로만 바꾼다.

---

## 1. 용어

서비스 이름(이땅내땅)과 "땅·깃발" 설정에 맞춰 **수확**으로 통일한다.

| 용어 | 뜻 |
|------|-----|
| 수확 포인트 | 깃발에 쌓인 포인트 |
| 직접 수확 | 깃발 영역 안에 가서 수확 포인트를 **전부** 받는 것 |
| 원격 수확 | 멀리서 수확 포인트의 **10%만** 받고 나머지는 사라지는 것 |
| 전체 원격 수확 | 내 모든 깃발을 한 번에 원격 수확하는 것 |

원격 수확은 "가지 않고 편하게 받는 대신 10%만 받는다"로 설명한다.

---

## 2. 현재 코드에서 확인한 사실

### 깃발 상태를 바꾸는 서버 경로 (전부)

| 경로 | 동작 | 수확에 미치는 영향 |
|------|------|------|
| `app/api/pins/create/route.ts` | 새 행 insert, `cost = 100` | 적립 시작 |
| `app/api/pins/[id]/reinforce/route.ts` | `cost`를 +100 | **적립 단가 변경 → 직전까지 정산 필요** |
| `app/api/pins/[id]/text/route.ts` | `text`만 변경 | 없음 |
| `app/api/pins/[id]/route.ts` `DELETE` | `status = 'hidden'` | 쌓인 포인트 처리 규칙 필요 |
| `app/api/conquer/route.ts` 성공 | 대상 깃발 `status = 'conquered'`, **새 `pins` 행 insert** (같은 좌표, 같은 `cost`) | **수확 포인트를 새 행으로 옮겨야 함** |
| `lib/landmark/zone.ts` `absorbPinsIntoLandmark` | `radius_meters`만 변경 | 없음 |

- 점령 성공은 기존 행을 넘겨받는 방식이 아니다. 대상은 `conquered`가 되고 공격자 소유의 새 행이 생긴다. 새 행의 `cost`는 대상 깃발의 `cost`를 그대로 쓴다.
- 현재 점령 성공 처리는 대상 깃발 update에 `status = 'active'` 조건이 없다(`app/api/conquer/route.ts` 210~218행). 같은 깃발에 동시에 두 번 성공하면 수확 포인트가 두 새 깃발에 복제될 수 있다. 그래서 수확 이전은 잠금이 걸린 한 트랜잭션에서 처리해야 한다(5장).
- 회원 탈퇴 시 `pins.user_id`가 `ON DELETE CASCADE`라서 깃발 행이 함께 지워진다(`001_initial_schema.sql`). 쌓인 포인트도 함께 사라진다.

### 예약 작업

- cron, `pg_cron`, Vercel cron 설정이 저장소에 없다. 매시 정각에 행을 갱신하는 배치는 없다.
- 그래서 적립은 **조회·정산 시점에 "마지막 정산 이후 지난 정각 횟수"로 계산**한다. KST는 UTC+9로 정수 시간 차이라서 UTC 정각과 KST 정각이 같다.

### 포인트 거래

- 잔액 변경과 거래 기록은 `apply_point_transaction` RPC 한 트랜잭션에서 처리한다(`037`). TS 진입점은 `lib/pins.ts`의 `addPoints`/`deductPoints`.
- 거래 타입 체크 제약의 최신 정의는 `035_missions.sql`이다. 허용 타입: `signup_bonus`, `create_pin`, `reinforce_pin`, `update_pin_text`, `conquer_attempt`, `random_point_claim`, `admin_adjust`, `daily_bonus`, `defense_reward`, `crew_create`, `pin_toll`, `mission_reward`.
- 누적 획득(`get_ranking('total_earned')`, `get_user_stats`)은 `amount > 0`이면서 `admin_adjust`, `mission_reward`가 아닌 거래를 모두 더한다(`035`). 새 타입은 따로 빼지 않으면 자동 포함된다.
- 활동 타임라인 제목은 `get_user_timeline`의 `CASE pt.type`에서 정한다(최신 `035`). 없는 타입은 "포인트 변동"으로 나온다.
- `038_restrict_rpc_execute.sql`이 서버 전용 RPC의 `anon`, `authenticated` 실행 권한을 막았다. 새 RPC도 같은 방식으로 막는다. `get_user_timeline`은 시그니처가 같으므로 `CREATE OR REPLACE`로 바꾸면 권한이 유지된다. `DROP` 후 `CREATE`하면 권한을 다시 줘야 한다.
- 미션 집계(`lib/missions/server.ts`)는 `create_pin`, `reinforce_pin`, `random_point_claim`, `daily_bonus`만 센다. 수확 거래는 미션에 영향이 없다.

### 출석

- `components/HomePage.tsx` 496~515행: 로그인한 `user.id`가 바뀌면 `POST /api/daily-bonus`를 한 번 호출한다. `claimed: true`면 토스트만 띄운다.
- 하루 경계는 KST 09:00(`DAILY_BONUS_RESET_HOUR_KST`, `lib/dailyBonus.ts`의 `getLatestDailyResetUtc`).

### 화면 마운트

- `components/layout/AppShell.tsx`: `HomePage`는 메인 탭(`/`, `/mission`, `/ranking`, `/crew`, `/my`)에서만 마운트된다. 지도 탭이 아니면 `invisible` 래퍼 안에 있다.
- `components/layout/OverlayPortal.tsx`는 `document.body`로 포털한다. `HomePage` 안에서 띄운 모달도 다른 메인 탭에서 보인다.
- 메인 탭이 아닌 경로(`/my/notifications`, `/guide` 등)로 바로 들어오면 `HomePage`가 없다. 출석도 이때는 처리되지 않는다. 팝업도 같은 시점에 맞춘다.

### 깃발 데이터 노출

- `GET /api/pins?all=true`는 비로그인 사용자에게도 활성 깃발의 모든 컬럼(`*`)을 돌려준다(`app/api/pins/route.ts`). `pins`에 컬럼을 추가하면 그대로 공개된다.

### 알림

- `notifications`는 사용자별 행이다(`030`). 카테고리 체크 제약: `crew`, `game`, `support`, `promotion`, `points`, `reminder`.
- 알림 화면(`components/my/NotificationsPage.tsx`)은 "전체" + 카테고리 필터 칩이다. 데이터는 `GET /api/my/notifications?category=`.
- 미읽음 배지(`NotificationBell`)는 `notifications.read_at IS NULL` 개수다.
- 공지는 전체 사용자 대상이라 사용자별 `notifications` 행으로 만들지 않는다(가입자 수만큼 행이 생기고, 이후 가입자는 받지 못함).

### 이용 가이드

- 가이드 본문은 DB가 아니라 코드다. `lib/guide/gameGuide.ts`의 `getGameGuideSections`/`getCrewGuideSections`가 `{ id, title, paragraphs, bullets }` 배열을 만든다.
- 지도 화면 `GuideModal`(`/api/guide?scope=game`)과 `/guide` 페이지(`getFullGuideSections`)가 같은 섹션을 쓴다.

### 관리자

- 메뉴: `components/admin/AdminShell.tsx`의 `MENU`. 상단 제목: `components/admin/AdminPageMeta.tsx`의 `ROUTE_META`.
- API 인증: `lib/admin/requireAdmin.ts`, DB 접근: `createAdminClient()`(service role).
- 목록·상세 패턴: `app/admin/inquiries/page.tsx`, `app/api/admin/inquiries/route.ts`, `app/api/admin/inquiries/[id]/route.ts`.
- 공통 UI: `components/admin/AdminUi.tsx`(`AdminCard`, `AdminTable`, `AdminInput`, `AdminTextarea`, `AdminSelect`, `AdminButton`, `StatusBadge`).

### "다시 보지 않기" 유사 기능

- 없음. 클라이언트 저장은 `localStorage`(`lib/mapLayerPreferences.ts`, `lib/auth/session.ts`)와 Capacitor `Preferences`(`lib/auth/nativeSession.ts`) 패턴만 있다.

---

## 3. 수확 규칙

### 적립

- 매 정각(UTC 기준 정각 = KST 정각)마다 `cost × 1%`가 쌓인다. `cost`는 100~1000의 100 단위라서 시간당 적립은 항상 정수(1~10P)다.
- 한도는 **24시간치**, 즉 그 시점 `cost`의 24%다. 가득 차면 수확할 때까지 더 쌓이지 않는다. `cost`가 100 단위라서 한도도 항상 정수다.
- 꽂은 시각 이후 **처음 오는 정각**부터 쌓인다. 10:20에 꽂으면 11:00에 첫 1%.
- 강화로 `cost`가 바뀌면, 강화 직전까지 쌓인 양을 이전 `cost` 기준으로 확정하고 이후 정각부터 새 `cost`로 쌓는다. 한도도 새 `cost`의 24%로 커진다. "정시 기준으로 그 시점의 깃발 포인트로 계산"과 같다.

| 투자 포인트 | 시간당 | 가득 참 (24시간치) | 가득 찼을 때 원격 수확 |
|------|------|------|------|
| 100P | 1P | 24P | 2P |
| 500P | 5P | 120P | 12P |
| 1000P | 10P | 240P | 24P |

하루 한 번 이상 직접 수확하면 깃발마다 하루에 투자 포인트의 24%를 받는다. 하루를 넘기면 넘긴 시간만큼은 쌓이지 않는다.

### 저장 방식 (지연 계산)

`pins`에 두 컬럼을 추가한다.

- `harvest_stored INTEGER NOT NULL DEFAULT 0` — 마지막 정산 때 확정된 수확 포인트
- `harvest_settled_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', NOW())` — 마지막으로 반영한 정각

현재 수확 포인트:

```
지난 정각 수 = floor(now / 1시간) - floor(harvest_settled_at / 1시간)
시간당 적립  = cost × 1 / 100
한도         = 시간당 적립 × 24
수확 포인트  = min(한도, harvest_stored + 지난 정각 수 × 시간당 적립)
남은 정각 수 = ceil((한도 - 수확 포인트) / 시간당 적립)
가득 차는 시각 = date_trunc('hour', now) + 남은 정각 수 × 1시간   (남은 정각 수가 0이면 이미 가득 참)
```

강화 직후에는 이전 `cost`로 쌓인 양이 새 시간당 적립의 배수가 아닐 수 있어서 올림(`ceil`)을 쓴다.

정산은 위 값을 `harvest_stored`에 쓰고 `harvest_settled_at = date_trunc('hour', now)`로 옮기는 것이다. 정산 시점이 언제든 결과는 같다.

### 출시 시점의 기존 깃발

- 마이그레이션에서 기존 활성 깃발의 `harvest_settled_at`을 **마이그레이션 시각의 정각**으로 둔다. 소급 적립하지 않는다. 소급하면 오래된 깃발이 출시 즉시 가득 찬다.

### 수확

| 방식 | 조건 | 받는 양 | 깃발에 남는 양 |
|------|------|------|------|
| 직접 수확 | 내 활성 깃발, 현재 위치가 `radius_meters` 안 (강화와 같은 판정) | 전부 | 0 |
| 원격 수확 (1개) | 내 활성 깃발, 위치 무관 | `floor(수확 포인트 × 10%)` | 0 (나머지 소멸) |
| 전체 원격 수확 | 내 활성 깃발 중 수확 포인트 > 0 전부 | `floor(합계 × 10%)` | 모두 0 |

- 전체 원격 수확은 깃발별로 나눠 버림하지 않고 **전체 합계의 10%를 한 번 버림**한다. 예: 깃발 3개에 50P, 45P, 34P(합계 129P)가 쌓였으면 12P를 받고 117P는 사라진다.
- 받을 양이 0P면 원격 수확을 막는다. 예: 수확 포인트 9P면 10%가 0.9P라서 0P를 받고 9P만 사라진다. 전체 원격 수확도 합계가 10P 미만이면 막는다.
- 랜드마크 깃발은 반경이 5m(`LANDMARK_PIN_RADIUS_METERS`)라서 직접 수확도 5m 안이어야 한다. 강화와 같은 조건이다.
- 거래 타입: `harvest_direct`, `harvest_remote`. 1개 수확은 `related_id = pin_id`, 전체 원격 수확은 `related_id = NULL`, 설명에 깃발 수.

### 점령

- 점령 성공 시 대상 깃발의 현재 수확 포인트를 정산해 **새 깃발 행의 `harvest_stored`로 옮긴다**. `harvest_settled_at`도 정산 정각으로 둔다. 적립이 끊기지 않는다.
- 대상 깃발은 `harvest_stored = 0`으로 둔다.
- 새 주인은 그 자리(이미 영역 안)에서 바로 직접 수확할 수 있다.
- 점령 실패는 수확 포인트에 영향 없다.

### 삭제

- 깃발을 삭제(`hidden`)하면 쌓인 수확 포인트도 사라진다. 삭제 확인 문구에 "쌓인 수확 포인트 N P도 함께 사라집니다"를 넣는다.

### 누적 획득·랭킹

- `harvest_direct`, `harvest_remote`는 통행료·방어 보상과 같은 게임 수입으로 보고 누적 획득 합계에 **포함**한다(현재 SQL 그대로면 자동 포함).

---

## 4. 수확 화면

### 깃발 상세 (`components/PinBottomSheet.tsx`)

투자 포인트 줄 아래에 수확 줄을 둔다. 모든 사용자에게 보인다. 남의 깃발을 점령하면 수확 포인트도 가져온다는 사실이 점령 동기가 된다.

예시는 500P 깃발(시간당 5P, 한도 120P)이다.

- 표시: `수확 포인트 85 / 120P` + 진행 막대
  - 쌓이는 중: `다음 정각 +5P · 7시간 뒤 가득 참`
  - 가득 참: `가득 참 · 수확하기 전까지 더 쌓이지 않아요` (강조 색)
- 내 깃발 + 영역 안: **직접 수확 (+85P)** 버튼
- 내 깃발 + 영역 밖: **원격 수확 (+8P)** 버튼, 아래에 "영역 안에서 직접 수확하면 85P를 모두 받아요" 안내
- 원격 수확은 확인창을 거친다: "원격 수확하면 8P만 받고 77P는 사라져요. 계속할까요?"
- 수확 포인트가 10P 미만이면 원격으로 받을 양이 0P라서 원격 수확 버튼을 비활성화하고 "10P 이상 쌓이면 원격 수확할 수 있어요"를 보여 준다.
- 남의 깃발: 수확 버튼 없음. "점령하면 쌓인 수확 포인트도 함께 가져와요"

### 출석 후 전체 원격 수확 안내

- `HomePage`의 출석 처리에서 `claimed: true`일 때 `GET /api/harvest/summary`를 부른다.
- 수확 포인트 합계가 0보다 크고, 원격 수확으로 받을 양이 1P 이상이면 모달을 띄운다.

```
내 깃발 12개에 수확 포인트 1,240P가 쌓였어요
(그중 7개는 가득 차서 더 쌓이지 않고 있어요)

· 직접 수확: 깃발 영역에 가면 전부 받아요
· 원격 수확: 지금 바로 124P만 받고, 나머지 1,116P는 사라져요

깃발에는 하루치까지만 쌓여요. 가득 찬 깃발은 수확할 때까지 더 쌓이지 않아요.

[ 지금 124P 원격 수확 ]   [ 직접 갈게요 ]
```

- 가득 찬 깃발이 없으면 괄호 줄은 뺀다. `GET /api/harvest/summary`는 가득 찬 깃발 수도 돌려준다.

- 출석은 리셋 구간(KST 09:00)당 한 번이므로 이 모달도 하루 한 번이다.
- 공지 팝업이 있으면 공지를 모두 닫은 뒤에 띄운다(6장 순서).

### 마이 화면 상시 진입점

출석 모달을 닫으면 다시 열 곳이 없으므로, `components/my/MyPage.tsx`의 현재 포인트 카드 아래(쿠폰함 위)에 카드를 둔다.

- `깃발 수확 · 깃발 N개에 X P` + **전체 원격 수확** 버튼(같은 확인 문구)
- 가득 찬 깃발이 있으면 `가득 찬 깃발 M개 · 수확하기 전까지 더 쌓이지 않아요`를 함께 보여 준다.

### 설명 원칙

한도를 24시간치로 줄였으므로, 사용자가 "하루에 한 번은 수확해야 손해가 없다"를 어디서든 같은 말로 알게 한다.

| 위치 | 반드시 들어갈 내용 |
|------|------|
| 공지 초안(7장) | 하루치까지만 쌓임, 가득 차면 멈춤, 하루 한 번 수확 권장 |
| 이용 가이드(8장) | 위 내용 + 투자 포인트별 한도 예시 |
| 깃발 상세 | 현재/한도, 가득 차는 시각, 가득 찼을 때 "더 쌓이지 않아요" |
| 출석 후 안내 모달 | 가득 찬 깃발 수, "하루치까지만 쌓여요" |
| 마이 화면 카드 | 가득 찬 깃발 수 |

"하루치"는 사용자 문구, "24시간치"는 수치를 보여 줄 때 쓴다. 출석·미션의 "하루"(KST 09:00 경계)와는 다른 개념이므로, 수확 한도를 설명할 때는 "오전 9시에 초기화" 같은 표현을 쓰지 않는다. 수확 한도는 마지막으로 수확한 뒤 24번째 정각에 찬다.

용어는 "수확"으로 통일한다. 사용자 문구에 "거두다", "회수", "수거" 같은 다른 동사를 쓰지 않는다.

---

## 5. 수확 서버

### 마이그레이션 `042_pin_harvest.sql`

1. `pins`에 `harvest_stored`, `harvest_settled_at` 추가. 기존 행은 `date_trunc('hour', NOW())`.
2. `point_transactions_type_check`에 `harvest_direct`, `harvest_remote` 추가(`035`의 목록 + 2개).
3. `get_user_timeline`을 `CREATE OR REPLACE`로 바꾸고 `WHEN 'harvest_direct' THEN '직접 수확'`, `WHEN 'harvest_remote' THEN '원격 수확'`을 추가한다.
4. RPC (모두 `SECURITY DEFINER`, `anon`/`authenticated` 실행 차단, `service_role`만 허용)
   - `harvest_pins(p_user_id, p_pin_ids UUID[], p_mode TEXT, p_remote_percent INT)`  
     `p_pin_ids`가 NULL이면 그 사용자의 활성 깃발 전부. `p_pin_ids`가 있어도 `user_id = p_user_id AND status = 'active'`인 행만 대상이다. 대상 행을 `FOR UPDATE`로 잠그고 잠근 뒤에 상태를 다시 확인한다(같은 깃발의 점령 RPC와 순서가 보장됨). 현재 수확 포인트를 계산해 지급액을 정한다. 깃발은 `harvest_stored = 0`, `harvest_settled_at = 정각`. 프로필 잔액 증가와 거래 기록을 같은 트랜잭션에서 처리한다. 반환: 지급액, 수확 포인트 합계, 깃발 수, 새 잔액. 지급액이 0이면 아무것도 바꾸지 않고 실패 코드를 돌려준다.
   - `reinforce_pin_with_harvest(p_pin_id, p_user_id, p_next_cost, p_text)`  
     한 `UPDATE`로 이전 `cost` 기준 정산 + `cost`·`text`·`last_reinforced_at` 변경. 조건은 지금 라우트와 같은 `status = 'active' AND user_id = p_user_id`.
   - `conquer_pin_with_harvest(p_target_pin_id, p_attacker_id, p_text, p_radius_meters)`  
     대상 행을 `FOR UPDATE`로 잠그고 `status = 'active'`를 확인한다. 수확 포인트 정산, 대상 `conquered` 처리, 새 행 insert(수확 포인트 이전)를 한 트랜잭션에서 처리하고 새 행을 반환한다. 이미 점령된 경우 실패 코드를 돌려준다.

적립 비율(1%), 한도 시간(24), 원격 수확 비율(10%)은 TS 상수에 둔다. RPC는 인자로 받는다(`claim_mission_reward`가 보상액을 인자로 받는 방식과 같음).

### TS

- `lib/constants.ts`: `PIN_HARVEST_HOURLY_PERCENT = 1`, `PIN_HARVEST_MAX_HOURS = 24`, `PIN_HARVEST_REMOTE_PERCENT = 10`
- `lib/harvest.ts`: 표시용 계산(`getPinHarvestAvailable(pin, nowMs)`, 한도, 다음 정각까지 남은 시간, 가득 차는 시각). 공식은 3장과 같다. 정산은 항상 SQL에서 한다. 화면 값은 표시용이다.
- `types/pin.ts`: `harvest_stored`, `harvest_settled_at` 추가

### API

| 메서드 | 경로 | 설명 |
|------|------|------|
| `POST` | `/api/pins/[id]/harvest` | body `{ mode: "direct" \| "remote", current_lat?, current_lng? }`. `direct`는 위치를 서버에서 다시 확인 |
| `GET` | `/api/harvest/summary` | 내 활성 깃발의 수확 포인트 합계, 쌓인 깃발 수, 가득 찬 깃발 수, 원격 수확 시 받을 양 |
| `POST` | `/api/harvest/remote-all` | 전체 원격 수확 |

응답에는 새 잔액(`points`), 받은 양, 사라진 양을 넣는다. 화면은 `setProfilePoints`로 잔액을 반영한다.

- 1개 수확 응답에는 갱신된 깃발 행을 넣는다. `HomePage`의 `pins`·`selectedPin`을 그 값으로 바꾼다(강화의 `onReinforced`와 같은 방식).
- 전체 원격 수확 뒤에는 `HomePage`가 `fetchPins()`로 깃발을 다시 불러온다. 지도에 들고 있는 깃발의 `harvest_stored`가 모두 바뀌기 때문이다.

### 기존 라우트 변경

- `app/api/pins/[id]/reinforce/route.ts`: 깃발 update를 `reinforce_pin_with_harvest` RPC로 바꾼다. 실패 시 환불은 지금과 같다.
- `app/api/conquer/route.ts`: 성공 분기의 대상 update와 새 행 insert를 `conquer_pin_with_harvest` RPC로 바꾼다. RPC가 "이미 점령됨"을 돌려주면 이미 차감한 시도 비용을 지금 라우트들과 같은 `admin_adjust` 환불로 되돌린다.
- `app/api/pins/[id]/route.ts` `DELETE`: 동작은 그대로. 확인 문구만 화면에서 바꾼다.

---

## 6. 공지

### 데이터

마이그레이션 `043_announcements.sql`

`announcements`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | 최대 60자 |
| `body` | TEXT NOT NULL | 최대 2000자. 일반 텍스트, 줄바꿈 유지 |
| `is_published` | BOOLEAN NOT NULL DEFAULT FALSE | 공개 여부 |
| `published_at` | TIMESTAMPTZ NULL | 처음 공개한 시각. 목록 정렬 기준 |
| `popup_ends_at` | TIMESTAMPTZ NULL | 이 시각 이후 로그인 팝업 중지. NULL이면 계속. 처음 공개 시 비어 있으면 공개일 + 7일 |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

`announcement_dismissals`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `user_id` | UUID → `profiles(id)` ON DELETE CASCADE | |
| `announcement_id` | UUID → `announcements(id)` ON DELETE CASCADE | |
| `hidden_until` | TIMESTAMPTZ NULL | NULL이면 다시 보지 않기, 값이 있으면 그 시각까지 숨김 |
| `updated_at` | TIMESTAMPTZ | |
| PK `(user_id, announcement_id)` | | |

- 두 테이블 모두 RLS를 켜고 정책은 두지 않는다. 읽기·쓰기는 서버 API(service role)만 한다.
- "다시 보지 않기"는 서버에 저장한다. 앱과 웹, 다른 기기에서도 같은 상태가 된다.

### 로그인 팝업

- 대상: `is_published = TRUE`, `popup_ends_at IS NULL OR popup_ends_at > NOW()`, 내 `announcement_dismissals`에서 숨김 상태가 아닌 공지. 최신순.
- 시점: `HomePage`에서 로그인 사용자(`user.id`)가 정해졌을 때. 출석 처리와 같은 시점이다.
- 여러 개면 최신부터 하나씩 띄운다.
- 버튼
  - **오늘 하루 보지 않기** → `hidden_until = 다음 KST 09:00` (`getLatestDailyResetUtc(now) + 24시간`)
  - **다시 보지 않기** → `hidden_until = NULL`
  - **닫기** → 저장 없음. 다음 접속 때 다시 뜬다
- 순서: 공지 팝업 → (모두 닫으면) 출석 후 전체 원격 수확 모달. 출석 토스트는 지금처럼 바로 띄운다.
- `HomePage`는 지도 탭을 떠날 때(`active`가 false) 선택·모달 상태를 초기화한다(`HomePage.tsx` 142~158행). 공지 팝업·출석 수확 모달 상태는 이 초기화에 넣지 않는다. 넣으면 다른 탭으로 이동하는 순간 팝업이 닫힌다.
- KST 09:00 경계라서, 예를 들어 08:50에 "오늘 하루 보지 않기"를 누르면 10분 뒤(09:00 이후 접속)에 다시 뜬다.

### 알림 > 공지 탭

- `components/my/NotificationsPage.tsx`의 필터 칩에 **공지**를 추가한다. 위치는 "전체" 바로 다음.
- 공지 탭은 `notifications`가 아니라 `GET /api/announcements`(공개 공지 최신순)를 그린다. "전체" 탭에는 섞지 않는다.
- 항목을 누르면 로그인 팝업과 같은 모달로 본문을 보여 준다. 이때는 **닫기**만 둔다.
- 공지는 미읽음 배지(`NotificationBell`)와 "모두 읽음"에 포함하지 않는다. 푸시도 보내지 않는다.

### 관리자 공지 관리

- 메뉴: `콘텐츠관리 > 공지 관리` (`/admin/announcements`)
- 목록: 제목, 상태(공개/비공개), 팝업(진행 중/종료/없음), 공개일, 수정일
- 작성·수정: 제목, 본문, 공개 여부, 팝업 종료일(선택). 오른쪽에 사용자 팝업과 같은 모양의 미리보기
- 공개로 처음 바꿀 때 `published_at = NOW()`. 다시 비공개로 바꿔도 `published_at`은 유지한다.
- 처음 공개할 때 팝업 종료일이 비어 있으면 `published_at + 7일`로 채운다(`ANNOUNCEMENT_POPUP_DEFAULT_DAYS = 7`). 관리자는 이후 날짜를 바꾸거나 비울 수 있다. 수정 화면에서 공개로 전환하면 팝업 종료일 입력란에도 같은 기본값을 미리 보여 준다.
- 삭제 가능(`announcement_dismissals`는 CASCADE)
- `ROUTE_META`에 목록·새 글·상세 제목 추가

### API

| 메서드 | 경로 | 설명 |
|------|------|------|
| `GET` | `/api/announcements` | 공개 공지 목록 (로그인 필요) |
| `GET` | `/api/announcements/popup` | 지금 띄울 팝업 목록 |
| `POST` | `/api/announcements/[id]/dismiss` | body `{ scope: "today" \| "forever" }` |
| `GET`, `POST` | `/api/admin/announcements` | 관리자 목록·생성 |
| `GET`, `PATCH`, `DELETE` | `/api/admin/announcements/[id]` | 관리자 상세·수정·삭제 |

검증은 `lib/validation/announcement.ts`에 둔다(`lib/validation/inquiry.ts`와 같은 형태). 길이 상수는 `lib/constants.ts`.

---

## 7. 새 기능 공지 초안 운영 방식

- 새 기능을 구현할 때 그 기능을 설명하는 공지를 **비공개 초안**으로 넣는 마이그레이션을 함께 만든다. 파일 하나에 공지 하나.
- 운영자는 관리자 공지 관리에서 내용을 확인·수정하고 **공개**로 바꾸면 된다.
- 이번 기능의 초안: `044_announcement_draft_pin_harvest.sql`

### 초안 내용 (깃발 수확)

제목

```
새 기능: 깃발 수확이 열렸어요
```

본문

```
이제 내 깃발에 시간이 지날수록 포인트가 쌓여요.

• 매시 정각마다 깃발 투자 포인트의 1%가 쌓여요. (100P 깃발은 1시간에 1P, 1000P 깃발은 10P)
• 깃발에는 하루치(24시간치)까지만 쌓여요. 100P 깃발은 24P, 1000P 깃발은 240P에서 가득 차요.
• 가득 차면 수확할 때까지 더 쌓이지 않아요. 하루에 한 번은 꼭 수확해 주세요!
• 직접 수확: 깃발 영역 안에 가서 수확하면 쌓인 포인트를 전부 받아요.
• 원격 수확: 멀리서도 수확할 수 있지만 10%만 받고 나머지 90%는 사라져요.
• 전체 원격 수확: 깃발이 많다면 마이 화면에서 모든 깃발을 한 번에 원격 수확할 수 있어요.
• 깃발이 점령당하면 쌓인 포인트도 새 주인에게 넘어가요.

자세한 내용은 지도 화면 ? 버튼의 이용 가이드에서 볼 수 있어요.
```

---

## 8. 이용 가이드 변경 (`lib/guide/gameGuide.ts`)

수치는 상수에서 만든다(기존 섹션과 같은 방식).

### "포인트 얻기" 섹션 bullets에 추가

```
🌾 깃발 수확: 내 깃발에 매시 정각마다 투자 포인트의 1%가 하루치까지 쌓여요. 영역 안에서 직접 수확하면 전부, 멀리서 원격 수확하면 10%만 받아요.
```

### 새 섹션 `harvest` "깃발 수확" (`toll` 섹션 다음)

paragraphs

```
깃발은 꽂아 두기만 해도 포인트를 키워요. 매시 정각마다 그 깃발 투자 포인트의 1%가 쌓여요.
깃발에는 하루치(24시간치)까지만 쌓이고, 가득 차면 수확할 때까지 멈춰요. 하루에 한 번 직접 수확하면 손해 없이 모두 받을 수 있어요.
깃발을 눌러 지금 쌓인 수확 포인트, 다음 정각에 늘어날 양, 가득 차는 시각을 볼 수 있어요.
```

bullets

```
가득 차는 양: 100P 깃발 24P · 500P 깃발 120P · 1000P 깃발 240P
직접 수확: 내 깃발 영역 안에서 「직접 수확」을 누르면 쌓인 포인트를 모두 받아요.
원격 수확: 영역 밖에서도 받을 수 있지만, 쌓인 포인트의 10%만 받고 나머지는 사라져요.
전체 원격 수확: 마이 화면에서 모든 깃발을 한 번에 원격 수확할 수 있어요. 출석할 때도 안내해 드려요.
강화하면 다음 정각부터 늘어난 투자 포인트 기준으로 쌓이고, 하루치 한도도 함께 커져요. (500P → 600P로 강화하면 한도 120P → 144P)
깃발이 점령당하면 쌓여 있던 수확 포인트는 새 주인에게 넘어가요.
깃발을 삭제하면 쌓여 있던 수확 포인트도 함께 사라져요.
```

### "확률 점령" 섹션 paragraphs에 추가

```
점령에 성공하면 그 깃발에 쌓여 있던 수확 포인트도 함께 가져와요.
```

---

## 9. 구현 순서

1. `042_pin_harvest.sql` (컬럼, 거래 타입, 타임라인, RPC 3개, 권한)
2. 상수, `lib/harvest.ts`, `types/pin.ts`
3. 강화·점령 라우트를 RPC로 교체
4. 수확 API 3개
5. `PinBottomSheet` 수확 줄·버튼·확인창, 삭제 확인 문구
6. 마이 화면 전체 원격 수확 카드
7. `043_announcements.sql`, 공지 API, 관리자 공지 관리
8. 로그인 공지 팝업, 알림 공지 탭
9. 출석 후 전체 원격 수확 모달(공지 팝업 다음 순서)
10. 이용 가이드 변경
11. `044_announcement_draft_pin_harvest.sql`

구현 전에 `node_modules/next/dist/docs/`에서 Route Handler·동적 라우트 `params` 관련 문서를 다시 확인한다(`AGENTS.md`).

---

## 10. 하지 않는 것

- 매시 정각 배치(cron)로 행을 갱신하는 것. 지연 계산으로 충분하다.
- 수확 가능 알림·푸시
- 공지 푸시, 공지 미읽음 배지
- 공지 이미지·서식(마크다운). 일반 텍스트만
- 비로그인 사용자 공지 팝업
- 수확을 미션 진행 수에 포함하는 것

---

## 11. 결정 사항

| 항목 | 값 | 상태 |
|------|------|------|
| 적립 한도 | 24시간치(그 시점 투자 포인트의 24%). 처음 요청의 "100%(100시간)"에서 변경 | 확정 (2026-10-12) |
| 기존 깃발 적립 시작 | 출시 시각부터. 소급 없음 | 확정 (2026-10-12) |
| 수확 포인트 공개 범위 | 모든 사용자에게 표시 | 확정 (2026-10-12) |
| 깃발 삭제 시 | 수확 포인트 소멸, 확인 문구로 고지 | 확정 (2026-10-12) |
| "오늘 하루 보지 않기" 경계 | KST 09:00 (`getLatestDailyResetUtc` 다음 경계) | 확정 (2026-10-12) |
| 용어 | 직접 수확 · 원격 수확 · 전체 원격 수확 | 확정 (2026-10-12) |
| 원격 수확 소수점 | 버림. 받을 양이 0P면 막음 | 확정 (2026-10-12) |
| 전체 원격 수확 계산 | 전체 합계의 10%를 버림 (129P → 12P) | 확정 (2026-10-12) |
| 누적 획득 랭킹 | 수확 포함 | 기본값 |
| 수확 수치 | 시간당 1%, 원격 10% 유지. 한도만 24시간치로 줄임 | 확정 (2026-10-12) |
| 공지 팝업 종료일 | 처음 공개 시 비어 있으면 공개일 + 7일, 관리자 수정 가능 | 확정 (2026-10-12) |

---

## 12. 검토 기록 (2026-10-12)

아래 세 항목을 검토했고, 결정은 11장에 있다.

### 포인트 공급량

수확은 깃발에 투자한 포인트에 비례해 계속 포인트를 만든다. 처음 요청(한도 100시간) 기준으로 계산하면 다음과 같다.

- 100시간 안에 한 번 이상 직접 수확하면 하루에 투자 포인트의 **24%**를 받는다. 원격 수확만 하면 **2.4%**다.
- 공급량은 과하다고 보지 않았다. 포인트를 차감하는 코드는 깃발 꽂기·강화·문구 변경·점령 도전·크루 생성뿐이다(`deductPoints` 호출처 5곳). 큰 수입은 깃발마다 직접 가야 얻는다.
- 문제는 접속 빈도였다. 한도가 100시간이면 4일에 한 번 들어와도 손해가 없다. 원격 수확은 언제 하든 쌓인 양의 10%라서 매일 할 이유도 없다.
- **결정: 시간당 1%는 유지하고 한도를 24시간치로 줄인다.** 매일 직접 수확하는 사용자의 공급량(하루 24%)은 그대로이고, 하루를 넘기면 넘긴 시간만큼은 쌓이지 않는다.

아래는 처음 계산 기록이다.

- 깃발 생성(100P)과 강화 1회(100P)는 각각 시간당 1P를 늘린다. 직접 수확으로는 100시간(약 4.2일), 원격 수확으로는 1,000시간(약 41.7일)이면 투자한 만큼 돌려받는다. 그 뒤로는 순수익이다.
- 깃발 생성 라우트(`app/api/pins/create/route.ts`)에는 사용자별 깃발 개수 제한이 없다. 제약은 100m 간격과 보유 포인트뿐이다.
- 비교: 출석 10P/일, 일간 미션 전체 40P/일.
- 예: 1000P 깃발 10개(투자 약 10,000P)를 가진 사용자는 직접 수확으로 하루 최대 2,400P, 출석 때 전체 원격 수확만 해도 하루 240P를 받는다.
- 누적 획득 랭킹(`total_earned`)도 수확 비중이 커진다.

### 점령 기대값 변화

- 지금은 점령 성공 1회의 기대 비용이 확률과 관계없이 투자 포인트 × 1.1이다(1000P 깃발이면 약 1,100P).
- 수확 포인트가 가득 찬 1000P 깃발을 75%로 점령하면 시도 비용은 825P이고, 성공하면 1,000P를 그 자리에서 바로 직접 수확할 수 있다. 성공 1회 기대 비용 1,100P와 수확 1,000P가 거의 상쇄된다.
- 요청한 방향(쌓인 깃발이 점령 표적이 됨)과 같지만 효과가 크다. 주인이 오래 수확하지 않은 깃발일수록 점령이 거의 공짜가 된다.
- **24시간 한도 적용 후:** 1000P 깃발에 쌓일 수 있는 최대치가 240P라서 성공 1회 기대 비용 1,100P의 약 22%만 상쇄된다. 쌓인 깃발은 여전히 더 좋은 표적이지만 점령이 공짜가 되지는 않는다.

### 오래된 공지가 신규 가입자에게 뜸

- 팝업 대상은 "공개 + 팝업 종료일 전 + 내가 숨기지 않음"이다. 팝업 종료일을 비워 두면 몇 달 뒤 가입한 사용자도 "새 기능: …" 팝업을 받는다.
- 초안 공지는 공개일을 미리 알 수 없어서 팝업 종료일을 넣어 둘 수 없다.
- 해결: 처음 공개할 때 비어 있으면 공개일 + 7일로 채운다(6장).
