# iOS 앱 출시 진행 상황

> 최종 업데이트: 2026-08-29  
> 상세 절차: [`ios/README.md`](../ios/README.md) · 단계별 대화 가이드는 이 문서의 **「단계별 진행」** 참고

---

## 요약

| 구분 | 상태 |
|------|------|
| 코드·프로젝트 (Capacitor iOS) | ✅ 완료 |
| Firebase iOS 앱 등록 | ✅ 완료 (1단계) |
| Xcode plist · Signing · Capabilities | ✅ 완료 (2단계) |
| Apple Developer Program 결제 | ✅ 유효 (만료 11일 전 확인) |
| APNs Auth Key → Firebase 업로드 | ✅ 완료 (3단계) |
| iPhone 실기기 빌드·기능 테스트 | 🔄 진행 중 (4단계) — 로그인 UX 수정 |
| TestFlight | ⏸ 대기 |
| App Store 심사·출시 | ⏸ 대기 |

**다음에 할 일:** 4단계 실기기 테스트 마무리 → TestFlight(5단계).

---

## 코드베이스에 반영된 작업 (저장소)

- [x] `@capacitor/ios`, `@capacitor-firebase/messaging` 추가
- [x] `ios/` Xcode 프로젝트 (`com.planndoit.pinwalk`)
- [x] `Info.plist` — 위치 권한 문구, `remote-notification` Background Mode
- [x] `AppDelegate.swift` — APNs ↔ Capacitor/Firebase 브릿지
- [x] `App.entitlements` — Push (`aps-environment`: development)
- [x] `capacitor.config.ts` — FirebaseMessaging, SPM symlink
- [x] `lib/capacitor/push.ts` — iOS: Firebase Messaging / Android: Push Notifications
- [x] `lib/notifications/fcmV1.ts` — APNs 페이로드
- [x] 앱 아이콘·스플래시 (`assets/logo.png` → `capacitor-assets`)
- [x] `npm run cap:sync:ios`, `npm run cap:ios` 스크립트
- [x] `@capacitor/preferences` — iOS 네이티브 세션 저장 (로그인 fix)

---

## 로컬·콘솔에서 완료한 작업 (git에 없음)

- [x] Firebase Console — iOS 앱 추가 (Bundle ID `com.planndoit.pinwalk`)
- [x] `GoogleService-Info.plist` → `ios/App/App/` 저장 (`.gitignore` 대상)
- [x] Xcode — plist Target Membership **App** 등록
- [x] Xcode — **Push Notifications** capability
- [x] Xcode — **Background Modes → Remote notifications**
- [ ] Xcode — **Team** 서명 (Apple Developer Program 결제 후 확정)

---

## 단계별 진행 (대화 가이드 기준)

### ✅ 1단계 — Firebase iOS 앱 등록

- [Firebase Console](https://console.firebase.google.com/) 동일 프로젝트에 iOS 앱 추가
- Bundle ID: `com.planndoit.pinwalk`
- `GoogleService-Info.plist` 다운로드 → `ios/App/App/GoogleService-Info.plist`

### ✅ 2단계 — Xcode plist · Signing · Capabilities

```bash
npm run cap:sync:ios
npm run cap:ios
```

- Project Navigator에 `GoogleService-Info.plist` (Target: App)
- Capabilities: Push Notifications, Background Modes (Remote notifications)
- Bundle Identifier: `com.planndoit.pinwalk`

### ✅ 3단계 — APNs Auth Key → Firebase

- Firebase Cloud Messaging에 APNs 인증 키 업로드 완료

### 🔄 4단계 — iPhone 실기기 빌드·테스트

- [x] 실기기 Run, 지도, 알림 허용, `push_tokens` ios 토큰
- [x] 로그인 UX 버그 수정 (`@capacitor/preferences` iOS 동기화)
- [ ] 로그인 후 모달 정상 닫힘 재확인
- [ ] 앱 재시작 후 세션 유지 확인

### ⏸ 5단계 — TestFlight

- Xcode **Product → Archive** → App Store Connect 업로드
- [App Store Connect](https://appstoreconnect.apple.com/) TestFlight 내부 테스트

### ⏸ 6단계 — App Store 심사

- 스크린샷·설명·App Privacy (위치 데이터)
- 약관 URL: `/legal/location-terms`, `/legal/location-consent`
- 심사용 테스트 계정

---

## Android 대비 참고

| 항목 | Android | iOS |
|------|---------|-----|
| 상태 | Play Console 제출 진행 중 | 4단계 진행 중 |
| 푸시 클라이언트 | `@capacitor/push-notifications` | `@capacitor-firebase/messaging` |
| Firebase 설정 파일 | `android/app/google-services.json` | `ios/App/App/GoogleService-Info.plist` |
| 서버 FCM | `FIREBASE_SERVICE_ACCOUNT_JSON` (Vercel) | 동일 |

---

## 재개 시 명령

```bash
cd /Users/ildango/2027/pinwalk
git pull
npm install
npm run cap:sync:ios
npm run cap:ios
```

Apple Developer 가입 후 **「3단계부터 진행」** 이라고 하면 APNs 키 업로드부터 이어서 안내.
