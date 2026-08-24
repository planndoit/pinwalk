# iOS 앱 (Capacitor)

> **진행 상황:** [`docs/ios-release-progress.md`](../docs/ios-release-progress.md) — 1~2단계 완료, 3단계(APNs)부터 Apple Developer 결제 후 재개.

번들 ID: `com.planndoit.pinwalk`  
WebView URL: `capacitor.config.ts`의 `server.url` (기본 `https://pinwalk.vercel.app`)

Android 설정은 [`android/README.md`](../android/README.md) 참고. Firebase·FCM 서버 설정은 Android와 **동일 Firebase 프로젝트**를 사용한다.

## 사전 준비

1. [Xcode](https://developer.apple.com/xcode/) 16+ (macOS)
2. [Apple Developer Program](https://developer.apple.com/programs/) 가입 (연 $99)
3. Android 작업과 동일한 Firebase 프로젝트

## 1. Firebase (iOS 앱 + 푸시)

1. [Firebase Console](https://console.firebase.google.com/) → **iOS 앱 추가**
2. Bundle ID: `com.planndoit.pinwalk`
3. `GoogleService-Info.plist` 다운로드 → `ios/App/App/GoogleService-Info.plist`에 저장  
   (예시: `GoogleService-Info.plist.example` 참고)
4. Xcode에서 **App/App** 그룹으로 plist 파일 드래그 (모든 타깃 포함)
5. Firebase Console → **프로젝트 설정 → Cloud Messaging → Apple 앱 구성**
   - APNs **Auth Key(.p8)** 또는 인증서 업로드 (Auth Key 권장)

> plist 없으면 빌드는 되지만 Firebase·푸시가 동작하지 않습니다.

## 2. 서버 푸시 (FCM HTTP v1)

Android와 동일. Vercel 환경변수:

| Name | Value |
|------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 서비스 계정 JSON 전체 |

또는 `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` 분리 설정.

iOS는 `@capacitor-firebase/messaging`으로 **FCM 토큰**을 등록한다 (`lib/capacitor/push.ts`). Android와 동일 API로 발송 가능.

## 3. Capacitor 동기화

웹/플러그인 변경 후:

```bash
npm run cap:sync:ios
```

Xcode 열기:

```bash
npm run cap:ios
```

## 4. Xcode 서명·Capabilities

1. **Signing & Capabilities** → Team 선택 (Apple Developer 계정)
2. **+ Capability** 추가:
   - **Push Notifications**
   - **Background Modes** → **Remote notifications** 체크
3. Bundle Identifier: `com.planndoit.pinwalk`

## 5. 실기기 테스트

1. iPhone USB 연결 (시뮬레이터는 푸시 불가)
2. Xcode → Run (▶)
3. 로그인 → 위치 권한 → 지도·깃발 → 알림함
4. 푸시: 로그인 후 `push_tokens` 테이블에 `platform=ios` 토큰 확인

### 로컬 웹 서버로 테스트 (선택)

```bash
export CAPACITOR_SERVER_URL=http://192.168.0.x:3000
npm run dev
npm run cap:sync:ios
```

> HTTP 로컬 테스트 시 `capacitor.config.ts`에서 `cleartext: true` 필요. 출시는 HTTPS 프로덕션 URL만.

## 6. TestFlight / App Store

1. Xcode → **Product → Archive**
2. **Distribute App** → App Store Connect 업로드
3. [App Store Connect](https://appstoreconnect.apple.com/)에서:
   - TestFlight 내부 테스트
   - 스크린샷·설명·개인정보(App Privacy) 작성
   - 위치 데이터 수집 목적 기재
   - 개인정보처리방침 URL, `/legal/location-terms`, `/legal/location-consent` URL
4. 심사 제출 — **테스트 계정** 제공

## 7. 네이버 지도

NCP Maps API 콘솔에 iOS 번들 ID `com.planndoit.pinwalk` 등록 후 WebView 지도 로드 확인.

## 8. 앱 아이콘·스플래시

```bash
npx capacitor-assets generate --ios
npm run cap:sync:ios
```

소스: `assets/logo.png`

## iOS vs Android 푸시 구현

| 플랫폼 | 클라이언트 | 토큰 |
|--------|-----------|------|
| Android | `@capacitor/push-notifications` | FCM |
| iOS | `@capacitor-firebase/messaging` | FCM |

서버는 FCM HTTP v1 하나로 양쪽 발송 (`lib/notifications/fcmV1.ts`).

## 관련 파일

| 파일 | 역할 |
|------|------|
| `capacitor.config.ts` | 앱 ID, server URL, FirebaseMessaging 설정 |
| `lib/capacitor/push.ts` | 플랫폼별 푸시 초기화 |
| `ios/App/App/Info.plist` | 위치 권한 문구, Background Modes |
| `ios/App/App/AppDelegate.swift` | APNs ↔ Capacitor/Firebase 브릿지 |
| `components/CapacitorBridge.tsx` | WebView 브릿지 진입점 |
