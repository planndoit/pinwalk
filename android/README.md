# Android 앱 (Capacitor)

패키지명: `com.planndoit.pinwalk`  
WebView URL: `capacitor.config.ts`의 `server.url` (기본 `https://pinwalk.vercel.app`)

## 사전 준비

1. [Android Studio](https://developer.android.com/studio) 설치
2. JDK 17+ (Android Studio 번들 사용 가능)
3. Google Play Console 개발자 계정 ($25, 1회)

## 1. Firebase (푸시 알림)

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. Android 앱 추가 — 패키지명 `com.planndoit.pinwalk`
3. `google-services.json` 다운로드 → `android/app/google-services.json`에 저장  
   (예시: `google-services.json.example` 참고)
4. Firebase 서비스 계정 키로 HTTP v1 푸시 발송 설정 (아래 「2. 서버 푸시 (FCM HTTP v1)」)

> `google-services.json`이 없으면 앱은 빌드되지만 푸시는 동작하지 않습니다.

## 2. 서버 푸시 (FCM HTTP v1)

레거시 서버 키(`FCM_SERVER_KEY`, `https://fcm.googleapis.com/fcm/send`)는 지원이 종료되었다. 서버는 Firebase Cloud Messaging **HTTP v1**만 사용한다.

1. [Google Cloud Console](https://console.cloud.google.com/)에서 Firebase와 같은 프로젝트(`google-services.json`의 `project_id`)를 연다.
2. **API 및 서비스 → 라이브러리**에서 **Firebase Cloud Messaging API**가 사용 설정인지 확인한다.
3. [Firebase Console](https://console.firebase.google.com/) → 프로젝트 설정(톱니바퀴) → **서비스 계정** → **새 비공개 키 생성** → JSON 다운로드.
4. Vercel → 프로젝트 → Settings → Environment Variables에 등록한다.

권장(한 변수):

| Name | Value |
|------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 다운로드한 JSON 전체(한 줄). `private_key`의 줄바꿈은 `\n`으로 유지 |

Vercel에서 JSON이 깨지면 세 변수로 나눈다: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

5. Production(필요하면 Preview)에 넣고 **재배포**한다. 환경변수는 재배포 후에만 적용된다.

JSON 키 파일은 git에 올리지 않는다. 로컬 발송 테스트가 필요하면 `.env.local`에만 넣는다.

## 3. Capacitor 동기화

웹/플러그인 변경 후:

```bash
npm run cap:sync:android
```

Android Studio 열기:

```bash
npm run cap:android
```

## 4. 실기기 테스트

- USB 디버깅 활성화 후 기기 연결
- Android Studio에서 Run (▶)
- 로그인 → 위치 권한 → 지도·깃발 → 알림함 확인
- 푸시: 로그인 상태에서 FCM 토큰 등록 (`push_tokens` 테이블)

### 로컬 웹 서버로 테스트 (선택)

`.env.local` 또는 셸에 설정:

```bash
export CAPACITOR_SERVER_URL=http://192.168.0.x:3000
npm run dev
npm run cap:sync:android
```

> HTTP 로컬 테스트 시 `capacitor.config.ts`에서 `cleartext: true` 필요. 출시 빌드는 HTTPS 프로덕션 URL만 사용.

## 5. 릴리스 서명 (Play Store)

1. keystore 생성 (1회, 안전한 곳에 보관):

```bash
keytool -genkey -v -keystore pinwalk-release.keystore -alias pinwalk -keyalg RSA -keysize 2048 -validity 10000
```

2. `android/keystore.properties` 생성 (`keystore.properties.example` 참고)

3. `android/app/build.gradle`에 signingConfigs.release 연결 (Play 업로드 전)

4. Android Studio: **Build → Generate Signed Bundle / APK** → **AAB** 선택

## 6. Play Console 제출

1. 내부 테스트 트랙에 AAB 업로드
2. 데이터 안전 설문: 위치, 계정 정보 기재
3. 개인정보처리방침 URL, 위치 약관 URL 등록  
   - `/legal/location-terms`  
   - `/legal/location-consent`
4. 스크린샷·아이콘(512×512) · 짧은/긴 설명 작성

## 7. 네이버 지도

NCP Maps API 콘솔에 Android 패키지명 `com.planndoit.pinwalk` 등록 후 WebView에서 지도 로드 확인.

## iOS

iOS 프로젝트는 MacBook에서 별도 진행 (`npx cap add ios`).
