# 깃발 수확 · 공지 팝업 기획

> 상태: **구현 완료 (마이그레이션 `042`~`044` 적용 필요).**  
> 목적: 깃발에 시간이 지나면서 포인트가 쌓이는 기능, 수확 랭킹, 운영 공지(기기 기준 팝업, 고객센터 공지사항, 관리자 공지 관리), 고객센터 화면을 이 문서를 기준으로 구현한다.  
> 기준 코드: 2026-10-13 `master` (`ba9146d`). 마이그레이션 마지막 번호는 `041`.

---

## 0. 요청 요약

1. 매시 정각마다 깃발 투자 포인트(`pins.cost`)의 1%가 깃발에 쌓인다. 한도는 24시간치(투자 포인트의 24%)다. 목적은 사용자가 하루에 한 번은 들어오게 하는 것이다.
2. 쌓인 포인트를 받는 방법은 두 가지다.
   - 깃발 영역 안에서 받기(직접 수확): 전액. 강화처럼 영역 안에 있어야 버튼이 활성화된다.
   - 멀리서 받기(원격 수확): 쌓인 포인트의 10%만 받고 나머지는 사라진다. 영역 밖에서(현재 위치를 모를 때 포함) 깃발을 열면 직접 수확 대신 원격 수확 버튼이 보인다.
3. 원격 수확은 깃발 하나씩, 또는 마이 화면의 **전체 원격 수확** 버튼으로 모든 깃발을 한 번에 할 수 있다.
4. 점령당한 깃발에 쌓여 있던 포인트는 사라지지 않고 새 주인에게 넘어간다. 점령 과정은 지금 그대로이고, 새 주인은 깃발을 눌러 따로 수확한다. 빼앗긴 사람의 점령 알림에는 넘어간 수확 포인트를 함께 적는다.
5. 출석 토스트 다음에 전체 깃발에 쌓인 수확 포인트를 **토스트로 알려 주기만** 한다. 버튼은 없다. 다른 메인 탭에 있어도 보여야 한다. 수확 실행은 마이 화면의 전체 원격 수확 버튼에서 한다.
6. 업데이트 공지를 **기기 기준**으로 팝업에 띄운다. 관리자가 공지를 작성·공개하고, 팝업 종료 일시(한국 시간, 날짜+시간)를 정한다. "오늘 하루 보지 않기", "다시 보지 않기"를 둔다.
7. 로그인 없이 들어갈 수 있는 **고객센터** 화면을 새로 만든다. 그 안에 **공지사항**(지난 공지 목록, 누르면 같은 팝업으로 다시 봄), 이용 가이드, 문의하기(누르면 로그인 필요), 약관을 둔다. 설정 화면의 약관·문의하기는 고객센터로 옮긴다. 마이 화면 설정 아이콘 메뉴는 설정 / 고객센터 / 로그아웃, 지도 화면 상단에는 로그인 여부와 관계없이 고객센터 아이콘 칩을 둔다.
8. 회원탈퇴는 지금 경고 문구 다음에 경고 팝업으로 한 번 더 확인한다.
9. **수확 랭킹**을 새로 만든다. 수확 포인트는 기존 "누적 포인트"(포인트 얻기 등 활동 수입)에서 빼서 따로 집계한다. 나중에 구분이 필요 없으면 합친다.
10. 새 기능은 이용 가이드에도 반영한다.
11. 새 기능이 생기면 설명 공지를 관리자 공지의 **비공개 초안**으로 함께 만들어 둔다. 운영자는 내용을 확인한 뒤 공개로만 바꾼다.

---

## 1. 용어

서비스 이름(이땅내땅)과 "땅·깃발" 설정에 맞춰 **수확**으로 통일한다.

| 용어 | 뜻 |
|------|-----|
| 수확 포인트 | 깃발에 쌓인 포인트 |
| 직접 수확 | 깃발 영역 안에서 수확 포인트를 **전부** 받는 것 |
| 원격 수확 | 영역 밖에서 수확 포인트의 **10%만** 받고 나머지는 사라지는 것 |
| 전체 원격 수확 | 마이 화면에서 내 모든 깃발을 한 번에 원격 수확하는 것 |

사용자 문구에 "거두다", "회수", "수거" 같은 다른 동사를 쓰지 않는다.

---

## 2. 현재 코드에서 확인한 사실

### 깃발 상태를 바꾸는 서버 경로 (전부)

| 경로 | 동작 | 수확에 미치는 영향 |
|------|------|------|
| `app/api/pins/create/route.ts` | 새 행 insert, `cost = 100` | 적립 시작 |
| `app/api/pins/[id]/reinforce/route.ts` | `cost`를 +100 | **적립 단가·한도 변경 → 직전까지 이전 `cost` 기준 정산 필요** |
| `app/api/pins/[id]/text/route.ts` | `text`만 변경 | 없음 |
| `app/api/pins/[id]/route.ts` `DELETE` | `status = 'hidden'` | 쌓인 포인트 소멸 |
| `app/api/conquer/route.ts` 성공 | 대상 깃발 `status = 'conquered'`, **새 `pins` 행 insert** (같은 좌표, 같은 `cost`) | **수확 포인트를 새 행으로 옮겨야 함** |
| `lib/landmark/zone.ts` `absorbPinsIntoLandmark` | `radius_meters`만 변경 | 없음 |

- 점령 성공 처리는 대상 깃발 update에 `status = 'active'` 조건이 없다(`app/api/conquer/route.ts` 209~224행). 같은 깃발에 동시에 두 번 성공하면 수확 포인트가 두 새 깃발에 복제될 수 있다. 그래서 수확 이전은 잠금이 걸린 한 트랜잭션에서 처리해야 한다(5장).
- 같은 성공 분기에서 새 깃발 insert가 실패하면 500을 돌려주고, 이미 차감한 시도 비용은 돌려주지 않는다(246~249행).
- 회원 탈퇴 시 `pins.user_id`가 `ON DELETE CASCADE`라서 깃발 행이 함께 지워진다(`001_initial_schema.sql`). 쌓인 포인트도 함께 사라진다.
- `pins_cost_check`는 `cost IN (100, 200, …, 1000)`이다(`032_pin_reinforce.sql`).

### 예약 작업

- cron, `pg_cron`, Vercel cron 설정이 저장소에 없다.
- 그래서 적립은 **조회·정산 시점에 "마지막 정산 이후 지난 정각 횟수"로 계산**한다. KST는 UTC+9로 정수 시간 차이라서 UTC 정각과 KST 정각이 같다.

### 포인트 거래

- 잔액 변경과 거래 기록은 `apply_point_transaction` RPC 한 트랜잭션에서 처리한다(`037`). 반환은 `success`, `new_points`, `error_code`이고 거래 id는 돌려주지 않는다. TS 진입점은 `lib/pins.ts`의 `addPoints`/`deductPoints`.
- 거래 타입 체크 제약의 최신 정의는 `035_missions.sql`이다. 허용 타입: `signup_bonus`, `create_pin`, `reinforce_pin`, `update_pin_text`, `conquer_attempt`, `random_point_claim`, `admin_adjust`, `daily_bonus`, `defense_reward`, `crew_create`, `pin_toll`, `mission_reward`.
- 누적 획득(`get_ranking('total_earned')`, `get_user_stats`)은 `amount > 0`이면서 `admin_adjust`, `mission_reward`가 아닌 거래를 모두 더한다(`035`). 새 타입은 목록에 넣지 않으면 자동 포함된다.
- 활동 타임라인 제목은 `get_user_timeline`의 `CASE pt.type`에서 정한다(최신 `035`). 없는 타입은 "포인트 변동"으로 나온다. `conquer_attempt` 거래는 타임라인에서 빠지고, 점령은 `pin_attempts` 행으로만 보인다.
- `038_restrict_rpc_execute.sql`이 서버 전용 RPC의 `anon`, `authenticated` 실행 권한을 막았다. 새 RPC도 같은 방식으로 막는다. 시그니처와 반환 형식이 같으면 `CREATE OR REPLACE`로 바꿔도 권한이 유지된다. `DROP` 후 `CREATE`하면 권한을 다시 줘야 한다.
- 미션 집계(`lib/missions/server.ts`)는 `create_pin`, `reinforce_pin`, `random_point_claim`, `daily_bonus`만 센다. 수확 거래는 미션에 영향이 없다.
- 관리자 대시보드의 포인트 획득 건수(`count_positive_point_txs`, `012`)는 `amount > 0`인 거래를 타입 구분 없이 센다.

### 랭킹

- `app/api/ranking/route.ts`의 `VALID_TYPES`: `combat_power`, `active_pins`, `total_earned`, `conquers`. `get_ranking(rtype, result_limit)`의 `CASE rtype`에서 값을 계산한다(최신 `035`).
- 화면 탭은 `components/ranking/RankingPage.tsx`의 `TABS`(전투력, 크루, 현재 깃발, 누적 포인트, 점령 수). `types/ranking.ts`의 `RankingType`.
- 마이 화면 "누적 획득"은 `get_user_stats.total_earned`다(`components/my/MyPage.tsx` 256행).

### 출석

- `components/HomePage.tsx` 496~515행: 로그인한 `user.id`가 바뀌면 `POST /api/daily-bonus`를 한 번 호출한다. `claimed: true`면 토스트만 띄운다.
- `HomePage`의 토스트는 상태 하나(`toast`)에 3초 동안 보인다(184~192행). 새 토스트가 오면 앞의 것을 덮어쓴다.
- 토스트는 `HomePage` DOM 안(1117~1123행, `fixed z-50`)에 그려지고 포털을 쓰지 않는다. 지도 탭이 아니면 `HomePage`를 감싼 `invisible` 래퍼 때문에 보이지 않는다. 지도 탭을 떠나면 `setToast(null)`로 지워진다(156행). 그래서 지금 출석 토스트는 마이·랭킹 등 다른 메인 탭에서 앱을 열면 보이지 않는다.
- `POST /api/daily-bonus`는 그 출석 구간에서 처음 처리될 때만 `claimed: true`를 돌려준다. 이미 출석했으면 `claimed: false`.
- 하루 경계는 KST 09:00(`DAILY_BONUS_RESET_HOUR_KST`, `lib/dailyBonus.ts`의 `getLatestDailyResetUtc`, `getAttendancePeriodKey`).

### 화면 마운트

- `app/layout.tsx`: `AuthProvider` 안에 `AppShell`이 있다.
- `components/layout/AppShell.tsx`: `/admin`은 그대로 렌더한다. `HomePage`는 메인 탭(`/`, `/mission`, `/ranking`, `/crew`, `/my`)에서만 마운트되고, 지도 탭이 아니면 `invisible` 래퍼 안에 있다. 메인 탭이 아닌 경로(`/my/notifications`, `/guide`, `/coupons`, `/legal/*` 등)에서는 `HomePage`가 없다.
- `components/layout/OverlayPortal.tsx`는 `document.body`로 포털한다.
- `HomePage`의 깃발 목록(`fetchPins`)은 첫 마운트, 현재 위치 갱신, 화면이 다시 보일 때(`visibilitychange`)만 다시 받는다. 메인 탭 이동만으로는 다시 받지 않는다.
- 모듈 수준 리스너로 화면 간 신호를 주는 패턴: `lib/premium/focusPlace.ts`, `lib/mapLayerPreferences.ts`.

### 깃발 상세

- `components/PinBottomSheet.tsx`: 영역 안 판정은 `currentPosition`과 `pin.radius_meters` 거리 비교다(249~256행). `currentPosition`이 없으면 영역 밖으로 본다. `HomePage`는 `position` 상태를 그대로 넘긴다. 수확도 이 판정을 그대로 쓴다(위치를 모르면 원격 수확).
- 시계는 `useClock(Boolean(pin && isOwner))`(136행)라서 남의 깃발에서는 갱신되지 않는다. `useClock`은 30초 단위다.
- 삭제 확인은 `window.confirm`(325행).

### 깃발 데이터 노출

- `GET /api/pins?all=true`는 비로그인 사용자에게도 활성 깃발의 모든 컬럼(`*`)을 돌려준다. `pins`에 컬럼을 추가하면 그대로 공개된다.

### 알림

- `notifications`는 사용자별 행이다(`030`). 알림 화면(`components/my/NotificationsPage.tsx`)은 "전체" + 카테고리 필터 칩이고, 비로그인이면 `/`로 보내고 로그인 모달을 연다.
- 미읽음 배지(`NotificationBell`)는 `notifications.read_at IS NULL` 개수다.

### 점령 알림

- `lib/notifications/events.ts`의 `notifyPinConquered`: 제목 `내 핀이 점령당했어요`, 본문 `{닉네임}가 "{문구}" 깃발을 점령했습니다.` 카테고리 `game`. `createNotification`(`lib/notifications/create.ts`)이 알림 행을 만들고, 푸시가 켜져 있으면 같은 제목·본문으로 푸시를 보낸다.
- 점령 라우트는 성공 후 `after()`에서 이 알림을 보낸다.

### 마이·설정·약관·문의·로그인 진입

- 마이 화면(`components/my/MyPage.tsx` 213~232행 메뉴) 상단 오른쪽: 알림 종, 설정 아이콘. 설정 아이콘을 누르면 메뉴에 **설정**(`/my/settings`), **로그아웃** 두 개가 있다.
- 설정 화면(`components/my/SettingsPage.tsx`): 약관 3개(`/legal/privacy`, `/legal/location-terms`, `/legal/location-consent`), 알림(알림함 `/my/notifications`, 알림 설정 `/my/settings/notifications`), 문의하기(`/my/inquiries`), 회원탈퇴. 비로그인이면 `/`로 보내고 로그인 모달을 연다.
- 약관 페이지(`app/legal/*`, `LegalPageShell`)와 이용 가이드(`app/guide/page.tsx`)는 로그인 검사가 없다. 비로그인도 열 수 있다.
- 문의 화면(`components/my/InquiriesPage.tsx`, `InquiryNewPage.tsx`, `InquiryDetailPage.tsx`)은 비로그인이면 `/`로 보내고 로그인 모달을 연다.
- 비로그인 사용자의 로그인 버튼은 지도 화면 상단 칩 줄(`components/PointBalance.tsx`)에만 있다. 칩 순서: 이용 가이드 `?`, 홍보 요청 `⭐`, 알림 종(로그인 시에만 보임), 포인트(로그인 시) 또는 **로그인**(비로그인 시).
- 로그인 모달은 `AuthProvider`가 그리므로 어느 화면에서나 `openAuthModal`로 열 수 있다. `requireAuth(onAuthed)`는 비로그인이면 모달만 열고 `false`를 돌려준다. 로그인이 끝난 뒤 `onAuthed`를 실행하지는 않는다.
- 하위 화면 헤더 `MySubpageHeader`의 뒤로 버튼은 `router.back()`이다.
- 회원탈퇴(`SettingsPage`): 화면 아래 **회원탈퇴**를 누르면 그 자리에 `탈퇴하면 계정과 데이터가 삭제되며 복구할 수 없습니다.`와 **취소** / **탈퇴 확인**이 나온다(`confirming` 상태). **탈퇴 확인**을 누르면 바로 `POST /api/auth/withdraw`를 부른다. 실패하면 오류 문구를 보여 주고 `confirming`을 끈다(크루 리더이고 멤버가 있으면 409 `크루 리더는 다른 멤버에게 리더를 위임한 뒤 탈퇴할 수 있습니다.`). 성공하면 로그아웃 후 `/`로 간다.
- 사용자 화면의 확인창은 `window.confirm`을 쓴다(`PinBottomSheet` 깃발 삭제, `CrewPage`). 공용 확인 모달 컴포넌트는 없다.

### 기기 저장

- 클라이언트 저장은 `localStorage`(`lib/mapLayerPreferences.ts`, `lib/auth/session.ts`), `sessionStorage`(`lib/premium/focusPlace.ts`), Capacitor `Preferences`(`lib/auth/nativeSession.ts`)가 있다.
- 앱은 Capacitor `server.url`로 웹 사이트를 그대로 띄운다(`capacitor.config.ts`). 앱과 웹이 같은 웹 코드를 쓴다.

### 관리자

- 메뉴: `components/admin/AdminShell.tsx`의 `MENU`. 상단 제목: `components/admin/AdminPageMeta.tsx`의 `ROUTE_META`.
- API 인증: `lib/admin/requireAdmin.ts`, DB 접근: `createAdminClient()`(service role).
- 목록·상세 패턴: `app/admin/inquiries/page.tsx`, `app/api/admin/inquiries/route.ts`, `app/api/admin/inquiries/[id]/route.ts`.
- 공통 UI: `components/admin/AdminUi.tsx`(`AdminCard`, `AdminTable`, `AdminInput`, `AdminTextarea`, `AdminSelect`, `AdminButton`, `StatusBadge`).
- 날짜+시간 입력 선례: 쿠폰 만료일 `AdminInput type="datetime-local"`(`app/admin/premium-places/[id]/page.tsx`). 입력값(`YYYY-MM-DDTHH:mm`, 시간대 없음)을 그대로 보내고 서버가 `new Date()`로 해석한다(`lib/validation/premium.ts`). 시간대 없는 문자열은 서버 프로세스의 시간대로 해석된다.
- 날짜 표시 함수 `formatActivityDate`(`lib/formatDate.ts`)는 `getHours()` 등 **기기 시간대**로 표시한다. 한국 시간 고정 표시에는 쓰지 않는다.

### 모달 겹침 순서 (z-index)

- 깃발·랜드마크·포인트 시트 `z-40`, 점령·깃발 꽂기 모달 `z-50`, 로그인 모달(`AuthModal`) `z-[60]`, 이용 가이드·약관 모달 `z-[70]`, 깃발 주인 사진 확대 `z-[80]`, 축하 효과 `z-[100]`.

### Route Handler 캐시

- `next.config.ts`에 Cache Components 설정이 없다. 이 경우 Route Handler는 기본으로 캐시하지 않는다(`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`). 공개 `GET` 공지 API도 요청마다 실행된다.

### 이용 가이드

- 가이드 본문은 코드다. `lib/guide/gameGuide.ts`의 `getGameGuideSections`가 `{ id, title, paragraphs, bullets }` 배열을 만든다. 크루 가이드는 `getCrewGuideSections`, 전체는 `getFullGuideSections`(게임 + 크루).
- `GuideModal`(`components/guide/GuideModal.tsx`, `OverlayPortal`, `z-[70]`)은 `GET /api/guide?scope=game|crew|full`로 섹션을 받는다. 로그인 검사가 없다. 지도 화면 `?`는 `scope="game"`, 크루 화면은 `scope="crew"`.
- `/guide` 페이지는 `getFullGuideSections`를 그린다. 헤더의 나가기 링크는 `← 지도`(`href="/"`)다.

---

## 3. 수확 규칙

### 적립

- 매 정각마다 `cost × 1%`가 쌓인다. `cost`는 100~1000의 100 단위라서 시간당 적립은 항상 정수(1~10P)다.
- 한도는 **24시간치**, 즉 그 시점 `cost`의 24%다. 가득 차면 수확할 때까지 더 쌓이지 않는다.
- 꽂은 시각 이후 **처음 오는 정각**부터 쌓인다. 10:20에 꽂으면 11:00에 첫 1%.
- 강화로 `cost`가 바뀌면, 강화 직전까지 쌓인 양을 **이전 `cost`의 시간당 적립과 이전 한도**로 확정하고 이후 정각부터 새 `cost`로 쌓는다. 한도도 새 `cost`의 24%로 커진다. 이전 한도로 먼저 자르지 않으면 이미 가득 차서 멈춰 있던 시간까지 새 한도로 채워진다.

| 투자 포인트 | 시간당 | 가득 참 (24시간치) | 가득 찼을 때 원격 수확 |
|------|------|------|------|
| 100P | 1P | 24P | 2P |
| 500P | 5P | 120P | 12P |
| 1000P | 10P | 240P | 24P |

### 저장 방식 (지연 계산)

`pins`에 두 컬럼을 추가한다.

- `harvest_stored INTEGER NOT NULL DEFAULT 0` — 마지막 정산 때 확정된 수확 포인트
- `harvest_settled_at TIMESTAMPTZ NOT NULL DEFAULT (지금의 정각, 아래 epoch 식)` — 마지막으로 반영한 정각

```
지난 정각 수 = floor(now / 1시간) - floor(harvest_settled_at / 1시간)
시간당 적립  = cost × 1 / 100
한도         = 시간당 적립 × 24
수확 포인트  = min(한도, harvest_stored + 지난 정각 수 × 시간당 적립)
남은 정각 수 = ceil((한도 - 수확 포인트) / 시간당 적립)      (0이면 가득 참)
```

- 정산은 위 값을 `harvest_stored`에 쓰고 `harvest_settled_at`을 지금의 정각으로 옮기는 것이다. 정산 시점이 언제든 결과는 같다.
- 강화 직후에는 쌓인 양이 새 시간당 적립의 배수가 아닐 수 있어서 남은 정각 수에 올림을 쓴다.
- 정각은 SQL·TS 모두 **UTC epoch 기준**으로 계산한다. SQL은 `to_timestamp(floor(extract(epoch FROM t) / 3600) * 3600)`, TS는 `Math.floor(ms / 3_600_000)`. `date_trunc('hour', timestamptz)`는 DB 세션 시간대를 따르므로 쓰지 않는다(컬럼 기본값 포함).
- 화면 값은 기기 시계로 계산하므로 기기 시계가 틀리면 표시가 어긋날 수 있다. 지급액은 항상 서버 계산이다.

### 출시 시점의 기존 깃발

- 마이그레이션에서 기존 활성 깃발의 `harvest_settled_at`을 마이그레이션 시각의 정각으로 둔다. 소급 적립하지 않는다.

### 수확

| 방식 | 조건 | 받는 양 | 깃발에 남는 양 |
|------|------|------|------|
| 직접 수확 | 내 활성 깃발, 현재 위치가 `radius_meters` 안(강화와 같은 판정), 수확 포인트 ≥ 1P | 전부 | 0 |
| 원격 수확 (1개) | 내 활성 깃발, 영역 밖, 받을 양 ≥ 1P | `floor(수확 포인트 × 10%)` | 0 (나머지 소멸) |
| 전체 원격 수확 | 내 활성 깃발 중 수확 포인트 > 0 전부, 받을 양 ≥ 1P | `floor(합계 × 10%)` | 모두 0 |

- 전체 원격 수확은 깃발별로 나눠 버림하지 않고 **전체 합계의 10%를 한 번 버림**한다. 예: 50P, 45P, 34P(합계 129P) → 12P를 받고 117P는 사라진다.
- 받을 양이 0P면 막는다. 직접 수확은 수확 포인트 0P, 원격 수확은 수확 포인트 10P 미만(1개) 또는 합계 10P 미만(전체)이다.
- 서버는 직접 수확의 위치를 다시 확인한다. 1개 원격 수확은 위치를 보내지 않으며, 서버는 영역 안 여부를 검사하지 않는다.
- 랜드마크 깃발은 반경이 5m(`LANDMARK_PIN_RADIUS_METERS`)라서 직접 수확도 5m 안이어야 한다.
- 거래 타입: `harvest_direct`, `harvest_remote`. 1개 수확은 `related_id = pin_id`, 전체 원격 수확은 `related_id = NULL`.
- 거래 설명(활동 내역의 제목 아래 줄):
  - 직접 수확: `깃발 1개 · 쌓인 85P 모두`
  - 원격 수확: `깃발 1개 · 쌓인 85P 중 10%`
  - 전체 원격 수확: `깃발 12개 · 쌓인 1,240P 중 10%`

### 점령

- 점령 성공 시 대상 깃발의 현재 수확 포인트를 정산해 **새 깃발 행의 `harvest_stored`로 옮긴다**. `harvest_settled_at`도 정산 정각으로 둔다.
- 대상 깃발은 `harvest_stored = 0`으로 둔다.
- 점령 과정(확률 선택, 성공·실패 처리, 성공 문구)은 지금 그대로다. 수확은 점령에 묶지 않는다. 새 주인은 점령 후 그 깃발을 눌러 따로 수확한다(그 자리는 이미 영역 안이라 직접 수확할 수 있다).
- 점령 실패는 수확 포인트에 영향 없다.
- **빼앗긴 사람의 점령 알림**에 넘어간 수확 포인트를 적는다. `notifyPinConquered`에 `harvestTransferred`(점령 RPC가 돌려준 새 행의 `harvest_stored`)를 넘긴다.
  - 1P 이상: `{닉네임}가 "{문구}" 깃발을 점령했습니다. 쌓여 있던 수확 포인트 85P도 함께 넘어갔어요.`
  - 0P: 지금 문구 그대로.
  - 알림함과 푸시 본문이 같다(`createNotification`이 같은 본문을 쓴다).

### 점령 처리 실패 환불

확률 판정은 성공했지만 점령 처리 RPC가 실패한 경우(같은 깃발을 다른 사람이 먼저 점령함, DB 오류)다. 이미 차감한 시도 비용을 돌려주고, 활동 내역에 **나간 포인트와 들어온 포인트를 모두** 보여 준다.

- 새 거래 타입 `conquer_refund`. 금액은 시도 비용, `related_id`는 **환불 대상인 `conquer_attempt` 거래의 id**, 설명은 `확률 점령 시도 (50%) 비용 환불`.
- 이를 위해 `apply_point_transaction`이 만든 거래의 id(`transaction_id`)를 함께 돌려주게 바꾼다. `deductPoints`·`addPoints` 결과에 `transactionId`를 넣는다.
- `pin_attempts`에는 남기지 않는다. 점령 시도가 성립하지 않았기 때문이다(점령 수·시도 기록·방어 보상에 영향 없음).
- 활동 내역(`get_user_timeline`):
  - `conquer_attempt` 거래는 지금처럼 숨기되, **`conquer_refund`가 가리키는 `conquer_attempt`는 보여 준다.** 제목 `점령 시도`, 금액 `-시도 비용`.
  - `conquer_refund`는 제목 `점령 처리 실패 환불`, 금액 `+시도 비용`.
  - 결과: `점령 시도 -55P`와 `점령 처리 실패 환불 +55P`가 나란히 보인다.
- `conquer_refund`는 누적 획득(`total_earned`·`earn_count`)에서 뺀다. 수입이 아니라 되돌림이다.

### 삭제

- 깃발을 삭제(`hidden`)하면 쌓인 수확 포인트도 사라진다. 삭제 확인 문구에 지금 시각 기준 수확 포인트를 넣는다: "이 깃발을 삭제할까요? 삭제 후에는 지도에서 사라지고, 쌓인 수확 포인트 N P도 함께 사라집니다." (N이 0이면 뒷부분 생략)

### 누적 획득·랭킹

- `harvest_direct`, `harvest_remote`는 **누적 획득(`total_earned`)에서 뺀다.** `get_ranking`·`get_user_stats`의 제외 목록에 두 타입과 `conquer_refund`를 추가한다.
- 대신 **수확 랭킹**(`harvest_earned`)을 새로 둔다(7장).
- 관리자 대시보드 포인트 획득 건수는 그대로 둔다(수확 포함).

---

## 4. 수확 화면

### 깃발 상세 (`components/PinBottomSheet.tsx`)

투자 포인트 줄 아래에 수확 줄을 둔다. 모든 사용자에게 보인다. 시계는 깃발이 열려 있으면 갱신한다(`useClock(Boolean(pin))`).

예시는 500P 깃발(한도 120P)이다.

- 표시: `수확 포인트 85 / 120P` + 진행 막대
  - 쌓이는 중: `매시 정각마다 쌓여요 · 7시간 안에 가득 차요` (7 = 남은 정각 수. 실제로는 6시간 몇 분 뒤에 차므로 "안에"로 쓴다)
  - 가득 참: `가득 참 · 수확하기 전까지 더 쌓이지 않아요` (강조 색)
- 다음 정각 적립량, 정각까지 남은 분은 보여 주지 않는다.

버튼 (내 깃발만):

| 상태 | 버튼 | 아래 안내 |
|------|------|------|
| 영역 안, 수확 포인트 ≥ 1P | **직접 수확 (+85P)** | 없음 |
| 영역 안, 수확 포인트 0P | 직접 수확 (비활성) | `아직 쌓인 수확 포인트가 없어요` |
| 영역 밖 또는 위치 모름, 수확 포인트 ≥ 10P | **원격 수확 (+8P)** | `영역 안에서 직접 수확하면 85P를 모두 받아요` |
| 영역 밖 또는 위치 모름, 수확 포인트 < 10P | 원격 수확 (비활성) | `10P 이상 쌓이면 원격 수확할 수 있어요` |

- 원격 수확은 확인창(`window.confirm`)을 거친다: "원격 수확하면 8P만 받고 77P는 사라져요. 계속할까요?"
- 수확 버튼은 강화·문구 변경 버튼과 별개로 둔다. 진행 중에는 다른 버튼과 함께 잠근다(`busy`).
- 성공 토스트는 응답의 실제 지급액으로 띄운다(정각을 넘기면 화면 값과 다를 수 있음).
- 남의 깃발: 수확 버튼 없음. `점령하면 쌓인 수확 포인트도 함께 가져와요`

### 출석 시 수확 안내 토스트

- 출석 토스트 다음에 **수확 안내 토스트**를 띄운다. 버튼은 없다. 목적은 인지뿐이다.
- 문구(한 줄):
  - 가득 찬 깃발이 없을 때: `내 깃발에 수확 포인트 1,240P가 쌓였어요`
  - 있을 때: `내 깃발에 수확 포인트 1,240P가 쌓였어요 · 가득 찬 깃발 7개`
- `GET /api/harvest/summary`로 합계를 받는다. 합계가 0P면 띄우지 않는다.
- 띄우는 기준: **출석 구간(KST 09:00)마다 기기·사용자별 1회.** `claimed: true` 응답에 묶지 않는다. 그래야 공지를 닫기 전에 앱을 끄거나 다른 화면으로 나가도, 다음에 메인 탭을 열 때 그 구간 안에서 한 번 뜬다.
  - 저장: `localStorage` 키 `pinwalk:harvest-notice:{userId}` = `getAttendancePeriodKey()`. 토스트를 실제로 띄운 시점에 저장한다.
  - 합계가 0P라서 띄우지 않았으면 저장하지 않는다.
  - `localStorage` 접근은 `lib/mapLayerPreferences.ts`처럼 `try/catch`로 감싼다(사파리 사생활 보호 모드 등에서 예외).
- 띄우는 조건: `HomePage`가 마운트된 메인 탭, 로그인 상태, 공지 팝업 진행 완료(6장).
- 처리 순서: `POST /api/daily-bonus` 응답을 받은 뒤(성공·실패 무관) 출석 토스트를 큐에 넣고, 이어서 저장 키가 이번 구간이 아니면 `GET /api/harvest/summary`를 불러 수확 안내 토스트를 큐에 넣는다. 저장 키가 이번 구간이면 요약을 부르지 않는다. 메인 탭이 다시 마운트돼 출석 처리가 다시 돌아도(`claimed: false`) 이 키 때문에 중복으로 뜨지 않는다.

### 출석·수확 안내 토스트 표시 방식

지금 출석 토스트는 지도 탭에서만 보인다(2장 출석). "다른 메인 탭에 있어도 인지시킨다"는 목적에 맞게, 출석 토스트와 수확 안내 토스트를 기존 지도 토스트와 분리한다.

- `HomePage`에 **알림 토스트 큐**를 따로 둔다. 출석 토스트, 수확 안내 토스트를 순서대로 넣는다.
- `OverlayPortal`로 `document.body`에 그린다. `invisible` 래퍼의 영향을 받지 않으므로 마이·랭킹 등 다른 메인 탭에서도 보인다.
- 지도 탭 이탈 초기화(142~158행)에 넣지 않는다. 탭을 옮겨도 사라지지 않는다.
- 하나씩 3초 동안 보여 주고 다음 것을 띄운다. 출석 토스트가 있으면 출석 → 수확 순서다.
- 공지 팝업이 떠 있는 동안에는 큐를 멈추고, 공지를 모두 닫은 뒤 시작한다. 팝업 뒤에 가려져 지나가지 않게 하기 위해서다.
- 모양은 기존 지도 토스트와 같게 한다.
- **지도 토스트와 겹치지 않게** 한 컨테이너에 세로로 쌓는다. `HomePage`가 `OverlayPortal`로 상단 토스트 컨테이너 하나를 그리고(지금 지도 토스트와 같은 `fixed top-28 left-4 right-4 z-50 pointer-events-none`), 그 안에 위에서부터 알림 토스트(출석·수확), 지도 토스트(깃발 꽂기·삭제 등)를 `flex-col gap-2`로 둔다. 둘이 동시에 있으면 위아래로 나란히 보인다.
- 지도 토스트의 동작(3초, 덮어쓰기, 지도 탭을 떠나면 지움)은 그대로 둔다. 컨테이너가 포털로 옮겨져도, 지도 탭을 떠날 때 `setToast(null)`로 지워지므로 다른 탭에 지도 토스트가 남지 않는다.
- 큐가 남은 상태에서 메인 탭이 아닌 화면으로 나가면 `HomePage`와 함께 큐도 사라진다. 출석 토스트는 지금과 같이 다시 뜨지 않고, 수확 안내는 아직 띄우지 않았으면 키가 저장되지 않았으므로 다음에 메인 탭을 열 때 뜬다.

### 마이 화면 전체 원격 수확

`components/my/MyPage.tsx`의 현재 포인트 카드 아래(쿠폰함 위)에 카드를 둔다.

```
깃발 수확
내 깃발 12개 · 쌓인 수확 포인트 1,240P
가득 찬 깃발 7개 · 수확하기 전까지 더 쌓이지 않아요

[ 전체 원격 수확 (+124P) ]

전체 원격 수확은 내 모든 깃발에 쌓인 수확 포인트를 한 번에 받는 기능이에요.
대신 합계의 10%만 받고 나머지 90%는 사라져요.
깃발 영역 안에 가서 직접 수확하면 쌓인 포인트를 모두 받을 수 있어요.
```

- "내 깃발 N개"는 활성 깃발 전체 수다. 가득 찬 깃발이 없으면 그 줄은 뺀다. 깃발이 없거나 합계가 0P면 `아직 쌓인 수확 포인트가 없어요`를 보여 주고 버튼을 비활성화한다.
- 카드 값은 마이 화면이 열릴 때 `GET /api/harvest/summary`로 받는다(마이 화면은 열 때마다 새로 마운트된다).
- 합계가 10P 미만이면 버튼을 비활성화하고 `10P 이상 쌓이면 전체 원격 수확할 수 있어요`를 보여 준다.
- 버튼을 누르면 확인창: "전체 원격 수확하면 124P만 받고 1,116P는 사라져요. 계속할까요?"
- 성공하면 응답으로 잔액(`setProfilePoints`)을 바꾸고, 카드·누적 통계·활동 내역을 다시 불러온다.
- 지도에 들고 있는 깃발의 수확 포인트도 모두 바뀌므로, 수확 성공 신호를 보내고 `HomePage`가 받아서 `fetchPins()`를 부른다. 신호는 `lib/premium/focusPlace.ts`처럼 모듈 수준 리스너로 만든다(`lib/harvest/refreshSignal.ts`). `HomePage`는 마이 탭에서도 마운트되어 있으므로 신호를 받는다.

### 설명 원칙

"하루에 한 번은 수확해야 손해가 없다"를 어디서든 같은 말로 알린다.

| 위치 | 반드시 들어갈 내용 |
|------|------|
| 공지 초안(8장) | 하루치까지만 쌓임, 가득 차면 멈춤, 하루 한 번 수확 권장 |
| 이용 가이드(10장) | 위 내용 + 투자 포인트별 한도 예시 |
| 깃발 상세 | 현재/한도, 몇 시간 안에 가득 차는지, 가득 찼을 때 "더 쌓이지 않아요" |
| 출석 시 안내 토스트 | 합계, 가득 찬 깃발 수 |
| 마이 화면 카드 | 합계, 가득 찬 깃발 수, 전체 원격 수확 설명 |

"하루치"는 사용자 문구, "24시간치"는 수치를 보여 줄 때 쓴다. 출석·미션의 "하루"(KST 09:00 경계)와 다른 개념이므로 수확 한도에 "오전 9시에 초기화" 같은 표현을 쓰지 않는다.

---

## 5. 수확 서버

### 마이그레이션 `042_pin_harvest.sql`

1. `pins`에 `harvest_stored`, `harvest_settled_at` 추가. 기본값과 기존 행 값은 epoch 기준 지금의 정각(3장).
2. `point_transactions_type_check`에 `harvest_direct`, `harvest_remote`, `conquer_refund` 추가(`035`의 목록 + 3개).
3. `get_user_timeline`(시그니처가 같으므로 `CREATE OR REPLACE`)
   - `WHEN 'harvest_direct' THEN '직접 수확'`, `WHEN 'harvest_remote' THEN '원격 수확'`, `WHEN 'conquer_refund' THEN '점령 처리 실패 환불'`, `WHEN 'conquer_attempt' THEN '점령 시도'` 추가.
   - 조건 `pt.type != 'conquer_attempt'`를 "`conquer_attempt`가 아니거나, 그 거래 id를 `related_id`로 가리키는 `conquer_refund`가 있음"으로 바꾼다(3장 점령 처리 실패 환불).
4. `get_ranking`: `total_earned`의 값·보조값 제외 목록에 `harvest_direct`, `harvest_remote`, `conquer_refund` 추가, `WHEN 'harvest_earned'` 추가(7장). `CREATE OR REPLACE`.
5. `get_user_stats`: `total_earned`, `earn_count` 제외 목록에 같은 세 타입 추가. 반환 형식은 그대로, `CREATE OR REPLACE`.
6. `apply_point_transaction`: 반환에 `transaction_id UUID`(insert한 거래의 id)를 추가한다. 반환 형식이 바뀌므로 `DROP FUNCTION` 후 `CREATE`하고 `037`과 같이 `PUBLIC`/`anon`/`authenticated` 차단, `service_role` 허용을 다시 건다. 실패 반환 행의 `transaction_id`는 NULL.
7. RPC (모두 `SECURITY DEFINER`, `SET search_path = public`, `anon`/`authenticated` 실행 차단, `service_role`만 허용)
   - `harvest_pins(p_user_id UUID, p_pin_ids UUID[], p_mode TEXT, p_hourly_percent INT, p_max_hours INT, p_remote_percent INT)`
     - `p_pin_ids`가 NULL이면 그 사용자의 활성 깃발 전부. 있어도 `user_id = p_user_id AND status = 'active'`인 행만 대상이다.
     - **`direct`는 `p_pin_ids`가 정확히 1개일 때만 허용한다.** NULL이나 여러 개면 실패 코드를 돌려준다. 위치 확인 없이 전부 직접 수확되는 호출을 막기 위해서다.
     - 대상 행을 **`ORDER BY id`로 `FOR UPDATE`** 잠근다. 순서를 고정해 동시 요청끼리 교착되지 않게 한다. 잠근 뒤 상태를 다시 확인한다.
     - 현재 수확 포인트를 계산해 지급액을 정한다(`direct`는 합계, `remote`는 합계의 `p_remote_percent`% 버림). 지급액이 0이면 아무것도 바꾸지 않고 실패 코드를 돌려준다.
     - 대상 깃발은 `harvest_stored = 0`, `harvest_settled_at = 정각`. 프로필 잔액 증가와 거래 기록을 같은 트랜잭션에서 처리한다.
     - 반환: 성공 여부, 실패 코드, 지급액, 수확 포인트 합계, 깃발 수, 새 잔액.
   - `reinforce_pin_with_harvest(p_pin_id UUID, p_user_id UUID, p_next_cost INT, p_text TEXT, p_hourly_percent INT, p_max_hours INT)`
     - 한 `UPDATE`로 이전 `cost` 기준 정산(이전 한도로 자름) + `cost`·`text`·`last_reinforced_at`·`updated_at` 변경. 조건은 지금 라우트와 같은 `status = 'active' AND user_id = p_user_id`. 갱신된 행을 반환한다.
   - `conquer_pin_with_harvest(p_target_pin_id UUID, p_attacker_id UUID, p_text TEXT, p_radius_meters INT, p_hourly_percent INT, p_max_hours INT)`
     - 대상 행을 `FOR UPDATE`로 잠그고 `status = 'active'`를 확인한다. 수확 포인트 정산, 대상 `conquered` 처리(`conquered_by`, `conquered_at`, `updated_at`, `harvest_stored = 0`), 새 행 insert(지금 라우트의 insert 값 + `harvest_stored` 이전 + `harvest_settled_at` 정각)를 한 트랜잭션에서 처리하고 새 행을 반환한다. 이미 점령된 경우 실패 코드를 돌려준다.
     - 새 행 반경(`p_radius_meters`)은 랜드마크 포함 여부로 정해지므로, 라우트는 `resolvePinLandmarkIds`를 먼저 끝낸 뒤 RPC를 부른다(지금은 대상 update와 병렬).

적립 비율(1%), 한도 시간(24), 원격 수확 비율(10%)은 TS 상수에 두고 RPC는 인자로 받는다(`claim_mission_reward`가 보상액을 인자로 받는 방식과 같음).

### TS

- `lib/constants.ts`: `PIN_HARVEST_HOURLY_PERCENT = 1`, `PIN_HARVEST_MAX_HOURS = 24`, `PIN_HARVEST_REMOTE_PERCENT = 10`
- `lib/harvest.ts`: 표시용 계산(`getPinHarvestState(pin, nowMs)` → 수확 포인트, 한도, 남은 정각 수, 가득 참 여부, 원격 수확 시 받을 양). 공식은 3장과 같다. 정산은 항상 SQL에서 한다.
- `lib/harvest/refreshSignal.ts`: 전체 원격 수확 성공 신호(4장).
- `lib/pins.ts`: `ApplyPointTransactionRow`에 `transaction_id`, `PointTransactionResult` 성공 결과에 `transactionId` 추가.
- `types/pin.ts`: `harvest_stored`, `harvest_settled_at` 추가

### API

| 메서드 | 경로 | 설명 |
|------|------|------|
| `POST` | `/api/pins/[id]/harvest` | body `{ mode: "direct" \| "remote", current_lat?, current_lng? }`. `direct`는 위치 필수, 서버에서 반경 재확인 |
| `GET` | `/api/harvest/summary` | 내 활성 깃발의 수확 포인트 합계, 깃발 수, 쌓인 깃발 수, 가득 찬 깃발 수, 전체 원격 수확 시 받을 양 |
| `POST` | `/api/harvest/remote-all` | 전체 원격 수확 |

- 응답에는 새 잔액(`points`), 받은 양, 사라진 양을 넣는다.
- 1개 수확 응답에는 갱신된 깃발 행을 넣는다. `HomePage`의 `pins`·`selectedPin`을 그 값으로 바꾼다(강화의 `onReinforced`와 같은 방식).
- `POST /api/pins/[id]/harvest`는 강화 라우트처럼 먼저 깃발을 읽어 검사한 뒤 RPC를 부른다. 오류 응답:

| 상황 | 상태 | 메시지 |
|------|------|------|
| 비로그인 | 401 | 로그인이 필요합니다. |
| `mode`가 잘못됨 / `direct`인데 위치 없음 | 400 | 수확 방식이 올바르지 않습니다. / 현재 위치 정보가 필요합니다. |
| 깃발 없음 | 404 | 깃발을 찾을 수 없습니다. |
| 내 깃발 아님 | 403 | 내 깃발만 수확할 수 있습니다. |
| 활성 아님 | 400 | 활성 깃발만 수확할 수 있습니다. |
| `direct`인데 영역 밖 | 400 | 깃발 영역 안에서만 직접 수확할 수 있습니다. |
| 받을 양 0P | 400 | 직접: 아직 쌓인 수확 포인트가 없어요. / 원격: 10P 이상 쌓이면 원격 수확할 수 있어요. |

- `POST /api/harvest/remote-all`의 받을 양 0P: 400 `10P 이상 쌓이면 전체 원격 수확할 수 있어요.`
- `GET /api/harvest/summary`는 내 활성 깃발의 `cost`, `harvest_stored`, `harvest_settled_at`을 읽어 `lib/harvest.ts`로 계산한다(표시용). 조회 시점의 값이므로, 화면의 확인 문구 금액과 실제 지급액은 정각을 넘기면 다를 수 있다. 성공 토스트는 응답의 실제 지급액을 쓴다.

### 기존 라우트 변경

- `app/api/pins/[id]/reinforce/route.ts`: 깃발 update를 `reinforce_pin_with_harvest` RPC로 바꾼다. 실패 시 환불은 지금과 같다.
- `app/api/conquer/route.ts`: 성공 분기의 대상 update와 새 행 insert를 `conquer_pin_with_harvest` RPC로 바꾼다. RPC가 실패하면(이미 점령됨·오류) `addPoints(user.id, cost, "conquer_refund", "확률 점령 시도 (N%) 비용 환불", 차감 거래의 transactionId)`로 환불하고 `pin_attempts`는 남기지 않는다. 응답은 지금 라우트처럼 `jsonError`로, 이미 점령됨이면 "이미 점령된 핀입니다."(400), 오류면 "점령 처리에 실패했습니다."(500)다. 차감과 환불이 상쇄되고, 화면(`HomePage` 700~702행)은 실패 응답에서 잔액을 바꾸지 않으므로 표시 잔액이 그대로 맞다.
- `app/api/pins/[id]/route.ts` `DELETE`: 동작은 그대로. 확인 문구만 화면에서 바꾼다.

---

## 6. 공지

### 노출 기준: 기기

- 공지 팝업은 로그인과 관계없이 **기기 기준**으로 띄운다. 비로그인 사용자에게도 뜬다.
- "오늘 하루 보지 않기", "다시 보지 않기" 상태는 기기의 `localStorage`에 저장한다(`lib/mapLayerPreferences.ts`와 같은 방식). 다른 기기·브라우저에서는 다시 뜬다. 서버에 사용자별 숨김 테이블을 두지 않는다.
- 저장 키: `pinwalk:announcement-dismissals` → `{ [announcementId]: "forever" | hiddenUntilIso }`. 읽을 때 **지난 `hiddenUntilIso`만** 지운다. `"forever"`는 지우지 않는다. 팝업 기간이 끝난 공지의 `"forever"`를 지우면, 관리자가 나중에 종료 일시를 늘렸을 때 "다시 보지 않기"를 누른 사용자에게 다시 뜨기 때문이다.
- `localStorage` 접근은 `try/catch`로 감싼다. 읽기에 실패하면 숨김 없음으로 보고, 쓰기에 실패하면 그 실행 동안만 메모리로 숨긴다.

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
| `popup_ends_at` | TIMESTAMPTZ NULL | 이 시각 이후 팝업 중지. NULL이면 계속 |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

- RLS를 켜고 정책은 두지 않는다. 읽기·쓰기는 서버 API(service role)만 한다.

### 팝업

- 대상: `is_published = TRUE`, `popup_ends_at IS NULL OR popup_ends_at > NOW()`인 공지 중 기기에서 숨기지 않은 것. 최신순(`published_at DESC`).
- 위치: **메인 탭(지도·미션·랭킹·크루·마이)에서만** 띄운다. `AppShell`의 메인 탭 분기(`HomePage`를 렌더하는 쪽)에 공지 팝업 컴포넌트를 둔다. 이용 가이드·약관·쿠폰함·알림 등 다른 화면에서는 띄우지 않는다. 출석 처리(`HomePage`)와 같은 범위라서 순서를 맞출 수 있다.
- 시점: 메인 탭이 처음 열릴 때 한 번 조회한다. 다른 화면에 갔다가 메인 탭으로 돌아와 다시 마운트돼도, 이번 실행에서 이미 조회했으면 다시 조회하지 않는다(모듈 메모리).
- 여러 개면 최신부터 하나씩 띄운다.
- 모양: 가운데 모달. 제목, 본문(줄바꿈 유지 `whitespace-pre-line`, 최대 높이를 두고 본문만 스크롤), 아래 버튼. `OverlayPortal` 사용.
- 겹침 순서는 `z-[55]`. 시트(`z-40`)·점령/깃발 꽂기 모달(`z-50`) 위, 로그인 모달(`z-[60]`)·이용 가이드/약관(`z-[70]`) 아래다. 공지가 떠 있을 때 로그인 모달이 열리면(예: 비로그인으로 설정·문의 화면에 들어갔다가 `/`로 돌아옴) 로그인 모달이 위에 온다.
- 버튼
  - **오늘 하루 보지 않기** → 다음 KST 09:00까지 숨김(`getLatestDailyResetUtc(now) + 24시간`)
  - **다시 보지 않기** → 영구 숨김
  - **닫기** → 저장하지 않는다. 이번 실행 동안만 다시 띄우지 않고(모듈 메모리), 앱을 다시 열면 다시 뜬다
- 출석·수확 안내 토스트와의 순서: 공지 팝업을 모두 닫은 뒤 토스트 큐를 시작한다(4장). 공지 팝업 진행 상태는 모듈 수준 상태(`lib/announcements/popupState.ts`)로 두고 `HomePage`가 구독한다. 공지 조회가 실패하거나 띄울 공지가 없으면 바로 "완료"로 둔다.
- KST 09:00 경계라서 08:50에 "오늘 하루 보지 않기"를 누르면 09:00 이후 다시 뜬다.

### 고객센터 (`/support`)

로그인 없이 들어갈 수 있는 화면이다. 메인 탭이 아니므로 공지 팝업·출석은 여기서 돌지 않는다.

- 파일: `app/support/page.tsx` → `components/support/SupportPage.tsx`. 레이아웃은 설정 화면과 같다(`h-dvh overflow-y-auto bg-gray-50 pb-safe`, `max-w-lg`, `MySubpageHeader title="고객센터"`, `section` + `h2` 묶음).
- 로그인 검사를 하지 않는다(설정·문의 화면처럼 `/`로 돌려보내지 않는다).
- 구성(위에서부터)

| 묶음 | 항목 | 동작 |
|------|------|------|
| (제목 없음) | 공지사항 | `/support/notices` |
| (제목 없음) | 이용 가이드 | `GuideModal`을 `scope="full"`, 제목 `이용 가이드`로 연다(게임 + 크루 가이드). 고객센터에 머문다 |
| (제목 없음) | 문의하기 | 로그인: `/my/inquiries`. 비로그인: `openAuthModal("login")`을 열고 고객센터에 머문다. 로그인 후 다시 누르면 들어간다(`requireAuth`는 로그인 뒤 이어서 실행하지 않는다, 2장) |
| 약관 | 개인정보처리방침, 위치기반서비스 이용약관, 개인위치정보 수집·이용 안내 | `/legal/privacy`, `/legal/location-terms`, `/legal/location-consent` (지금 설정 화면의 약관 묶음을 그대로 옮김) |

- 약관 화면의 뒤로(`router.back()`)를 누르면 고객센터로 돌아온다.

### 공지사항 (`/support/notices`)

- 파일: `app/support/notices/page.tsx` → `components/support/NoticesPage.tsx`. 로그인 불필요.
- `GET /api/announcements`(공개 공지 최신순)를 그린다. 항목: 제목, 공개일(`published_at`). 목록이 비면 `등록된 공지가 없어요`.
- 항목을 누르면 팝업과 같은 모달로 본문을 보여 준다. 이때는 **닫기**만 두고 기기 숨김 저장을 바꾸지 않는다.
- 공지는 알림(`notifications`)이 아니다. 알림 미읽음 배지·"모두 읽음"과 관계없고 푸시도 보내지 않는다. 알림 화면(`NotificationsPage`)은 바꾸지 않는다.

### 기존 화면 변경

- **설정**(`SettingsPage`): 약관 묶음과 문의하기 묶음을 뺀다. 알림 묶음(알림함, 알림 설정)과 회원탈퇴만 남는다. 로그인 필요는 그대로다.
- **회원탈퇴 2단계 확인**(`SettingsPage`): 지금 경고 문구와 **취소** / **탈퇴 확인**은 그대로 두고, **탈퇴 확인**을 누르면 경고 팝업(`window.confirm`)을 한 번 더 띄운다.
  - 문구: `정말 탈퇴할까요?\n탈퇴하면 계정과 데이터가 삭제되며 복구할 수 없습니다.`
  - 확인 → `POST /api/auth/withdraw`(이후 동작은 지금과 같음). 취소 → 아무것도 하지 않고 경고 문구 상태(`confirming`)를 유지한다.
  - 진행 중(`withdrawing`)에는 지금처럼 버튼을 잠근다.
- **마이 화면 설정 아이콘 메뉴**(`MyPage`): **설정**(`/my/settings`), **고객센터**(`/support`), **로그아웃** 세 개.
- **지도 상단 칩 줄**(`PointBalance`): 로그인 여부와 관계없이 **고객센터** 아이콘 칩(헤드셋, `/support`, 알림 칩과 같은 모양)을 둔다. 순서: `⭐`, 고객센터, 알림, 포인트(비로그인은 로그인). 이용 가이드는 고객센터로 옮겼으므로 지도 상단의 `?` 버튼은 뺀다.

### 관리자 공지 관리

- 메뉴: `고객지원 > 공지 관리` (`/admin/announcements`)
- 목록: 제목, 상태(공개/비공개), 팝업(진행 중/종료/없음), 공개일, 수정일
- 작성·수정(등록과 수정 화면의 입력 항목은 같다): 제목, 본문, 공개 여부, 팝업 종료 일시(선택). 오른쪽에 사용자 팝업과 같은 모양의 미리보기.
- **팝업 종료 일시는 날짜와 시간을 함께 입력하고, 한국 시간(KST)으로 해석한다.**
  - 입력: `AdminInput type="datetime-local"`. 값(`YYYY-MM-DDTHH:mm`)에 `+09:00`을 붙여 보낸다(`2026-10-20T18:00:00+09:00`). 서버는 시간대가 있는 문자열만 받는다. 관리자 PC의 시간대와 서버 프로세스의 시간대에 영향받지 않는다.
  - 표시: 저장된 값을 `Intl.DateTimeFormat`의 `timeZone: "Asia/Seoul"`로 바꿔 입력란과 목록에 보여 주고 "(한국 시간)"을 붙인다. `formatActivityDate`는 기기 시간대라 쓰지 않는다(2장 관리자).
  - 지난 일시도 저장할 수 있다. 목록의 팝업 상태가 "종료"로 보인다.
- 공개로 처음 바꿀 때(등록 시 공개로 저장하는 경우 포함) `published_at = NOW()`. 다시 비공개로 바꿔도 `published_at`은 유지한다.
- 처음 공개할 때 팝업 종료 일시가 비어 있으면 `published_at + 7일`로 채운다(`ANNOUNCEMENT_POPUP_DEFAULT_DAYS = 7`). 화면에서 공개로 전환하면 종료 일시 입력란에도 같은 기본값(지금 + 7일, KST)을 미리 넣는다. 관리자는 이후 바꾸거나 비울 수 있다.
- 비공개로 내렸다가 다시 공개하면 `published_at`이 그대로라 목록 순서도 처음 공개 시점 그대로다. **언제 공개하든 팝업 종료 일시가 지났으면 팝업은 뜨지 않는다.** 다시 공개할 때 종료 일시를 자동으로 바꾸지 않는다. 팝업을 다시 띄우려면 관리자가 종료 일시를 미래로 고친다.
- 공개 API 응답은 `id`, `title`, `body`, `published_at`만 돌려준다.
- 삭제 가능.
- `ROUTE_META`에 목록·새 글·상세 제목 추가.

### API

| 메서드 | 경로 | 설명 |
|------|------|------|
| `GET` | `/api/announcements` | 공개 공지 목록 (로그인 불필요) |
| `GET` | `/api/announcements/popup` | 지금 팝업 기간인 공개 공지 목록 (로그인 불필요). 기기 숨김은 클라이언트가 거른다 |
| `GET`, `POST` | `/api/admin/announcements` | 관리자 목록·생성 |
| `GET`, `PATCH`, `DELETE` | `/api/admin/announcements/[id]` | 관리자 상세·수정·삭제 |

검증은 `lib/validation/announcement.ts`에 둔다(`lib/validation/inquiry.ts`와 같은 형태). 길이 상수는 `lib/constants.ts`.

---

## 7. 수확 랭킹

- `RankingType`에 `harvest_earned` 추가. `app/api/ranking/route.ts`의 `VALID_TYPES`에도 추가.
- `get_ranking`의 `CASE rtype`에 `WHEN 'harvest_earned'`: `type IN ('harvest_direct', 'harvest_remote')`인 거래의 `amount` 합계.
- `RankingPage` 탭: "누적 포인트" 다음에 추가.
  - label `수확`, unit `P`
  - description `깃발 수확(직접·원격)으로 받은 포인트의 총합입니다.`
- "누적 포인트" 탭 설명에 `깃발 수확은 수확 랭킹에서 따로 집계합니다.`를 덧붙인다.
- 마이 화면 "누적 획득"에서도 수확이 빠진다(`get_user_stats` 변경).

---

## 8. 새 기능 공지 초안 운영 방식

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
• 직접 수확: 깃발 영역 안에서 깃발을 누르면 쌓인 포인트를 전부 받아요.
• 원격 수확: 영역 밖에서 깃발을 누르면 원격으로 받을 수 있지만, 10%만 받고 나머지 90%는 사라져요.
• 전체 원격 수확: 마이 화면에서 모든 깃발을 한 번에 원격 수확할 수 있어요.
• 깃발이 점령당하면 쌓인 포인트도 새 주인에게 넘어가요.
• 랭킹에 수확 랭킹이 새로 생겼어요.

자세한 내용은 고객센터의 이용 가이드에서 볼 수 있어요.
```

---

## 9. 구현 순서

1. `042_pin_harvest.sql` (컬럼, 거래 타입, 타임라인, 랭킹·통계, `apply_point_transaction` 반환 변경, RPC 3개, 권한)
2. 상수, `lib/harvest.ts`, `lib/pins.ts`(`transactionId`), `types/pin.ts`
3. 강화·점령 라우트를 RPC로 교체, 점령 처리 실패 환불, 점령 알림에 넘어간 수확 포인트 표시
4. 수확 API 3개
5. `PinBottomSheet` 수확 줄·버튼·확인창, 삭제 확인 문구
6. 마이 화면 전체 원격 수확 카드, 새로고침 신호
7. 수확 랭킹 탭
8. `043_announcements.sql`, 공지 API, 관리자 공지 관리
9. 기기 기준 공지 팝업
10. 고객센터·공지사항 화면, 설정 화면 정리(회원탈퇴 2단계 확인 포함), 마이 설정 아이콘 메뉴, 지도 고객센터 아이콘 칩
11. 출석·수확 안내 토스트 큐, 지도 토스트와 한 포털 컨테이너로 합치기(공지 팝업 다음 순서)
12. 이용 가이드 변경
13. `044_announcement_draft_pin_harvest.sql`

구현 전에 `node_modules/next/dist/docs/`에서 Route Handler·동적 라우트 `params` 관련 문서를 다시 확인한다(`AGENTS.md`).

---

## 10. 이용 가이드 변경 (`lib/guide/gameGuide.ts`)

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
깃발을 눌러 지금 쌓인 수확 포인트와 몇 시간 안에 가득 차는지 볼 수 있어요.
```

bullets

```
가득 차는 양: 100P 깃발 24P · 500P 깃발 120P · 1000P 깃발 240P
직접 수확: 내 깃발 영역 안에서 깃발을 누르고 「직접 수확」을 누르면 쌓인 포인트를 모두 받아요.
원격 수확: 영역 밖에서 깃발을 누르면 「원격 수확」이 보여요. 쌓인 포인트의 10%만 받고 나머지는 사라져요. 현재 위치를 확인하지 못했을 때도 원격 수확이 보여요.
전체 원격 수확: 마이 화면에서 모든 깃발을 한 번에 원격 수확할 수 있어요. 출석할 때 쌓인 양을 알려 드려요.
강화하면 다음 정각부터 늘어난 투자 포인트 기준으로 쌓이고, 하루치 한도도 함께 커져요. (500P → 600P로 강화하면 한도 120P → 144P)
깃발이 점령당하면 쌓여 있던 수확 포인트는 새 주인에게 넘어가요.
깃발을 삭제하면 쌓여 있던 수확 포인트도 함께 사라져요.
수확으로 받은 포인트는 수확 랭킹에 집계돼요.
```

### "확률 점령" 섹션 paragraphs에 추가

```
점령에 성공하면 그 깃발에 쌓여 있던 수확 포인트도 함께 넘어와요. 점령한 깃발을 눌러 수확하세요.
```

---

## 11. 하지 않는 것

- 매시 정각 배치(cron)로 행을 갱신하는 것
- 깃발 상세의 다음 정각 적립량·남은 분 표시
- 출석 안내에서 수확 실행
- 수확 가능 알림·푸시
- 공지 푸시, 공지 미읽음 배지
- 공지 이미지·서식(마크다운). 일반 텍스트만
- 공지 숨김 상태의 서버 저장(기기 간 동기화)
- 수확을 미션 진행 수에 포함하는 것
- 점령 과정에서 수확을 함께 처리하거나, 점령 성공 문구에 넘어온 수확 포인트를 넣는 것
- 공지를 알림 화면(`NotificationsPage`)에 섞는 것

---

## 12. 결정 사항

| 항목 | 값 | 상태 |
|------|------|------|
| 적립 한도 | 24시간치(그 시점 투자 포인트의 24%) | 확정 (2026-10-12) |
| 기존 깃발 적립 시작 | 출시 시각부터. 소급 없음 | 확정 (2026-10-12) |
| 수확 포인트 공개 범위 | 모든 사용자에게 표시 | 확정 (2026-10-12) |
| 깃발 삭제 시 | 수확 포인트 소멸, 확인 문구로 고지 | 확정 (2026-10-12) |
| 용어 | 직접 수확 · 원격 수확 · 전체 원격 수확 | 확정 (2026-10-12) |
| 원격 수확 소수점 | 버림. 받을 양이 0P면 막음 | 확정 (2026-10-12) |
| 전체 원격 수확 계산 | 전체 합계의 10%를 버림 (129P → 12P) | 확정 (2026-10-12) |
| 수확 수치 | 시간당 1%, 원격 10% | 확정 (2026-10-12) |
| 직접 수확 버튼 | 영역 안에서 활성, 수확 포인트 0P면 비활성 | 확정 (2026-10-13) |
| 영역 밖 버튼 | 직접 수확 대신 원격 수확 버튼 노출. 현재 위치를 모를 때도 원격 수확 | 확정 (2026-10-13) |
| 전체 원격 수확 실행 위치 | 마이 화면 버튼(설명 포함) | 확정 (2026-10-13) |
| 출석 시 수확 안내 | 출석 토스트 다음 토스트 한 줄, 버튼 없음. 다른 메인 탭에서도 보임(포털) | 확정 (2026-10-13) |
| 수확 안내 빈도 | 출석 구간(KST 09:00)마다 기기·사용자별 1회 | 확정 (2026-10-13) |
| 깃발 상세 시간 표시 | "매시 정각마다 쌓여요" + "N시간 안에 가득 차요"(N = 남은 정각 수) | 확정 (2026-10-13) |
| 누적 획득 랭킹 | 수확 제외. 수확 랭킹 신설 | 확정 (2026-10-13) |
| 공지 노출·숨김 기준 | 기기 기준(`localStorage`), 비로그인 포함 | 확정 (2026-10-13) |
| 공지 팝업 경로 | 메인 탭만 | 확정 (2026-10-13) |
| 점령 처리 실패 환불 | `conquer_refund` 타입. 활동 내역에 "점령 시도 -N P"와 "점령 처리 실패 환불 +N P"를 함께 표시 | 확정 (2026-10-13) |
| 출석 토스트 동작 변경 | 다른 메인 탭에서도 보임, 공지 팝업을 닫은 뒤 표시 | 확정 (2026-10-13) |
| "오늘 하루 보지 않기" 경계 | KST 09:00 | 확정 (2026-10-12) |
| 공지 팝업 종료 | 날짜+시간, 한국 시간. 처음 공개 시 비어 있으면 공개 시각 + 7일 | 확정 (2026-10-13) |
| 점령과 수확 | 점령은 지금 과정 그대로. 새 주인은 깃발을 눌러 따로 수확 | 확정 (2026-10-13) |
| 점령 알림 | 빼앗긴 사람 알림·푸시 본문에 넘어간 수확 포인트 표시(0P면 생략) | 확정 (2026-10-13) |
| 토스트 겹침 | 알림 토스트(출석·수확)와 지도 토스트를 한 포털 컨테이너에 세로로 쌓음 | 확정 (2026-10-13) |
| 고객센터 | `/support` 비로그인 접근. 공지사항·이용 가이드(모달, 전체 가이드)·문의하기·약관 | 확정 (2026-10-13) |
| 고객센터 문의하기(비로그인) | 로그인 모달을 열고 고객센터에 머묾. 로그인 후 다시 눌러 진입 | 확정 (2026-10-13) |
| 지도 고객센터 칩 | 로그인 여부와 관계없이 헤드셋 아이콘 칩, 알림 칩 왼쪽 | 확정 (2026-10-13) |
| 회원탈퇴 확인 | 경고 문구 → 탈퇴 확인 → 경고 팝업(`window.confirm`) → 탈퇴 | 확정 (2026-10-13) |
| 설정 화면 | 약관·문의하기 제거, 알림·회원탈퇴만 | 확정 (2026-10-13) |
| 마이 설정 아이콘 메뉴 | 설정 / 고객센터 / 로그아웃 | 확정 (2026-10-13) |
| 지난 공지 목록 | 고객센터 > 공지사항. 알림 화면에는 넣지 않음 | 확정 (2026-10-13) |
| 다시 공개한 공지 | 팝업 종료 일시가 지났으면 팝업 없음 | 확정 (2026-10-13) |

---

## 13. 확인 필요

없음.

---

## 14. 검토 기록 (2026-10-12)

### 포인트 공급량

- 처음 요청(한도 100시간)이면 4일에 한 번 들어와도 손해가 없었다. 원격 수확은 언제 하든 쌓인 양의 10%라서 매일 할 이유도 없었다.
- **결정: 시간당 1%는 유지하고 한도를 24시간치로 줄인다.** 매일 직접 수확하는 사용자의 공급량(하루 투자 포인트의 24%)은 그대로이고, 하루를 넘기면 넘긴 시간만큼은 쌓이지 않는다.
- 포인트를 차감하는 코드는 깃발 꽂기·강화·문구 변경·점령 도전·크루 생성뿐이다(`deductPoints` 호출처 5곳).
- 깃발 생성 라우트에는 사용자별 깃발 개수 제한이 없다. 제약은 100m 간격과 보유 포인트뿐이다.
- 비교: 출석 10P/일, 일간 미션 전체 40P/일. 1000P 깃발 10개면 직접 수확으로 하루 최대 2,400P, 전체 원격 수확만 해도 240P.

### 점령 기대값 변화

- 점령 성공 1회의 기대 비용은 확률과 관계없이 투자 포인트 × 1.1이다(`calculateConquerCost`).
- 24시간 한도에서 1000P 깃발에 쌓일 수 있는 최대치는 240P라서 성공 1회 기대 비용 1,100P의 약 22%만 상쇄된다.

### 오래된 공지가 신규 사용자에게 뜸

- 팝업 종료 일시를 비워 두면 몇 달 뒤 처음 앱을 연 기기에도 "새 기능: …" 팝업이 뜬다. 처음 공개할 때 비어 있으면 공개 시각 + 7일로 채운다.
