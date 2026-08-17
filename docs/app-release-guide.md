# 앱 스토어 출시 가이드

> 상태: **진행 전** — Capacitor 기반 iOS/Android 스토어 출시  
> 목적: pinwalk를 모바일 앱으로 출시할 때 따라갈 작업 순서와 체크리스트  
> 작성: 2026-08-17  
> 전제: 웹은 Next.js 풀스택(Vercel) + Supabase + 네이버 지도. 인앱 알림·푸시 토큰 API는 `030_notifications.sql` 기준 구현됨.

---

## 1. 출시 방식 (확정 권장)

pinwalk는 `/api/*` 서버 라우트를 많이 사용하므로 **정적 빌드(static export)는 불가**하다.  
**Capacitor WebView + 프로덕션 HTTPS URL** 방식을 권장한다.

| 방식 | 적합도 | 비고 |
|------|--------|------|
| **Capacitor + Vercel URL** | ✅ 권장 | API 유지, 코드 변경 최소 |
| PWA만 | △ | iOS 설치·푸시 제한, 스토어 노출 어려움 |
| React Native 재작성 | ✗ | 규모 과대 |
| Next.js static export | ✗ | API 라우트 사용 불가 |

### 목표 아키텍처

```
[iOS/Android 앱 — Capacitor WebView]
        ↓ HTTPS
[Vercel — Next.js + API Routes]
        ↓
[Supabase / Naver Maps / FCM]
```

---

## 2. Phase 1 — 프로덕션 웹 준비 (앱 작업 전 필수)

앱은 배포된 웹 URL을 불러오므로, **웹 프로덕션이 먼저** 안정적이어야 한다.

### 2-1. Vercel 프로덕션 배포

- [ ] GitHub `master` → Vercel 자동 배포 연결 확인
- [ ] 프로덕션 URL 확정 (예: `https://pinwalk.vercel.app` 또는 커스텀 도메인)
- [ ] `.env.local`의 모든 환경변수를 Vercel에 등록
- [ ] 로컬 `npm run build` 성공 확인

### 2-2. Supabase (프로덕션 DB)

- [ ] `supabase/migrations/` 전체 순서대로 적용 (`030_notifications.sql` 포함)
- [ ] Auth Provider·로그인 방식 프로덕션 동작 확인

### 2-3. 외부 서비스

- [ ] **네이버 지도**: NCP 콘솔에 프로덕션 도메인 등록
- [ ] **네이버 지도**: 앱 WebView용 번들 ID / 패키지명 등록 가능 여부 확인
- [ ] **TourAPI** (`TOUR_API_SERVICE_KEY`) 프로덕션 값 설정
- [ ] **Resend** (`RESEND_API_KEY`, `ADMIN_NOTIFICATION_EMAIL`) 프로덕션 값 설정

### 2-4. 프로덕션 기능 테스트 (모바일 Safari/Chrome)

- [ ] 회원가입·로그인
- [ ] 위치 권한 → 지도·깃발·점령
- [ ] 크루·알림함·문의
- [ ] 관리자(`/admin`) 앱 포함 여부 결정 (보통 제외)

---

## 3. Phase 2 — 개발자 계정·법적 준비

### 3-1. 스토어 계정

- [ ] **Apple Developer Program** 가입 (연 $99)
- [ ] **Google Play Console** 가입 (1회 $25)

### 3-2. 스토어 필수 자료

- [ ] **개인정보처리방침** URL (웹 공개 페이지)
- [ ] **위치기반서비스 이용약관** — `/legal/location-terms` 프로덕션 URL
- [ ] **개인위치정보 수집·이용 안내** — `/legal/location-consent` 프로덕션 URL
- [ ] 앱 설명, 스크린샷, 아이콘(1024×1024), 카테고리·연령 등급

### 3-3. 위치정보 (pinwalk 핵심)

- [ ] 위치 수집 **목적** 명시: 지도, 깃발, 점령, 랜덤 포인트 등
- [ ] **백그라운드 위치** 사용 여부 결정  
  - 현재 코드: 포그라운드 `watchPosition` 위주 → 미사용 시 OS 권한·스토어 설명도 일치시킬 것
- [ ] iOS **App Privacy** / Android **데이터 안전** 에 위치 데이터 기재

---

## 4. Phase 3 — Capacitor 프로젝트 세팅

### 4-1. 초기화

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npx cap sync
```

### 4-2. WebView URL 설정

`capacitor.config.ts` 예시:

```ts
const config = {
  appId: "com.planndoit.pinwalk", // 실제 번들 ID로 확정
  appName: "핀워크",
  server: {
    url: "https://your-production-domain.com",
    cleartext: false,
  },
};
```

- 개발 중: `server.url`을 로컬 IP(`http://192.168.x.x:3000`)로 두고 실기기 테스트
- 출시 빌드: **반드시 HTTPS 프로덕션 URL**

### 4-3. 권장 Capacitor 플러그인

| 플러그인 | 용도 |
|---------|------|
| `@capacitor/push-notifications` | 푸시 (서버 API 준비됨) |
| `@capacitor/splash-screen` | 스플래시 |
| `@capacitor/status-bar` | 상태바 |
| `@capacitor/app` | lifecycle, 딥링크 |
| `@capacitor/geolocation` | (선택) WebView geolocation 보완 |

---

## 5. Phase 4 — 앱 코드 연동 (pinwalk 추가 작업)

### 5-1. 푸시 알림

**이미 구현된 서버:**

- `POST /api/my/push-tokens` — 토큰 등록
- `DELETE /api/my/push-tokens` — 토큰 삭제
- `lib/notifications/push.ts` — `FCM_SERVER_KEY` 설정 시 FCM 발송

**앱에서 할 일:**

- [ ] Firebase 프로젝트 생성
- [ ] Android: `google-services.json` 추가
- [ ] iOS: APNs 키 → Firebase 연동, `GoogleService-Info.plist` 추가
- [ ] `@capacitor/push-notifications`로 토큰 수신 → `POST /api/my/push-tokens`
- [ ] 푸시 탭 시 딥링크 (`data.path`, `/my/notifications`, `/crew` 등)
- [ ] Vercel 환경변수에 `FCM_SERVER_KEY` 등록

### 5-2. 위치 권한 (OS)

**iOS `Info.plist`:**

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>지도에 현재 위치를 표시하고, 주변 깃발·포인트 기능을 이용하기 위해 위치 정보가 필요합니다.</string>
```

**Android `AndroidManifest.xml`:**

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

- WebView `navigator.geolocation`은 대부분 동작
- 권한 거부 시 `@capacitor/geolocation` fallback 검토

### 5-3. Safe Area·UX

- [ ] `pt-safe`, `pb-safe` — iOS 노치·홈 인디케이터 실기기 확인
- [ ] 하단 `BottomNav`와 iOS 홈 바 겹침 확인
- [ ] 스플래시 → WebView 로딩 중 로딩 UI

### 5-4. 인증 (Supabase 쿠키)

- WebView + 동일 도메인이면 쿠키 기반 Supabase Auth 동작 가능
- [ ] 로그인 유지·세션 만료(`lib/auth/constants.ts` `SESSION_IDLE_MS`) 실기기 테스트
- 문제 시 `@capacitor/preferences` + Supabase 세션 저장 검토

### 5-5. 관리자 페이지

- [ ] 앱 WebView에서 `/admin` 접근 차단 여부 결정

---

## 6. Phase 5 — 네이버 지도 앱 대응

- [ ] NCP Maps API 콘솔에 **앱 번들 ID / 패키지명** 등록
- [ ] WebView에서 네이버 지도 SDK 로드·터치·줌 실기기 테스트
- [ ] 저사양 기기 지도 성능·메모리 확인

---

## 7. Phase 6 — iOS 출시

### 7-1. Xcode

- [ ] Bundle Identifier, Signing Team, Version/Build
- [ ] App Icon, Launch Screen
- [ ] Push Notifications capability
- [ ] Background Modes — 푸시만 필요 시 백그라운드 위치 비활성

### 7-2. App Store Connect

- [ ] 앱 등록, 메타데이터·스크린샷
- [ ] App Privacy (위치, 사용자 ID 등)
- [ ] TestFlight 내부/외부 테스트

### 7-3. 심사 대비

- [ ] 위치 권한 거부 시 크래시 없음
- [ ] 리뷰어용 테스트 계정 제공
- [ ] UGC(깃발 문구) 부적절 콘텐츠 대응 방침

---

## 8. Phase 7 — Android 출시

### 8-1. Android Studio

- [ ] `applicationId`, keystore 생성·안전 보관
- [ ] `targetSdkVersion` 최신 요구사항 충족
- [ ] 알림 채널(Android 8+) 설정

### 8-2. Google Play Console

- [ ] 내부 테스트 → 클로즈드 → 프로덕션 단계적 배포
- [ ] 데이터 안전 설문 (위치, 계정)
- [ ] AAB 업로드, 스토어 등록정보

---

## 9. Phase 8 — 출시 전 최종 체크리스트

```
□ 프로덕션 URL HTTPS + 주요 API 정상
□ Supabase 030_notifications 마이그레이션 완료
□ 가입 → 위치 허용 → 깃발 → 점령 → 알림함 확인
□ 크루 가입 신청 → 리더 알림 → 승인 → 신청자 알림
□ 관리자 포인트 지급 → 알림
□ 푸시: 앱 종료/백그라운드 수신 + 탭 시 해당 화면 이동
□ 로그아웃·재로그인·앱 재시작 후 세션
□ 네트워크 끊김 시 UX
□ iOS + Android 각 2종 이상 기기 테스트
```

---

## 10. 권장 작업 순서 (요약)

```
1. Vercel 프로덕션 안정화 + DB 마이그레이션
2. Apple/Google 개발자 계정 + 법적 URL·스토어 자료
3. Capacitor 프로젝트 생성 (server.url = 프로덕션)
4. 위치 권한 + 푸시(Firebase) + 딥링크 연동
5. 실기기 QA
6. TestFlight / Play 내부 테스트
7. 스토어 심사 제출
```

---

## 11. 예상 일정 (1인 기준)

| 단계 | 예상 |
|------|------|
| 프로덕션 웹 + DB | 1~2일 |
| Capacitor 세팅 + 권한 | 2~3일 |
| 푸시 + 딥링크 | 2~3일 |
| 실기기 QA·버그 수정 | 3~5일 |
| 스토어 등록·심사 | 1~2주 (iOS 심사 변수) |

---

## 12. 관련 코드·문서

| 항목 | 경로 |
|------|------|
| 인앱 알림 DB | `supabase/migrations/030_notifications.sql` |
| 알림 생성 | `lib/notifications/` |
| 푸시 토큰 API | `app/api/my/push-tokens/route.ts` |
| 알림함 UI | `app/my/notifications/` |
| 알림 설정 UI | `app/my/settings/notifications/` |
| 위치 약관 | `app/legal/location-terms/`, `lib/legal/locationLegal.ts` |
| 위치 수집 코드 | `components/HomePage.tsx` (`watchPosition`) |
| 네이버 지도 | `components/MapView.tsx`, `lib/naverMap.ts` |
| 배포 개요 | `README.md` |

---

## 13. 환경변수 (앱 출시 시 추가·확인)

| 변수 | 용도 |
|------|------|
| `FCM_SERVER_KEY` | 서버 → FCM 푸시 발송 (`lib/notifications/push.ts`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth·DB |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth·DB |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | 지도 |
| 기타 | `README.md`, `.env.local.example` 참고 |

Firebase Android/iOS 설정 파일(`google-services.json`, `GoogleService-Info.plist`)은 **앱 네이티브 프로젝트**에 두며, Vercel 환경변수와는 별도다.
