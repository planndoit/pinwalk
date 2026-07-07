# 발도장

걷는 사람들을 위한 위치 기반 핀 점령 모바일웹 MVP입니다.

## 기술 스택

- Next.js, Tailwind CSS
- Naver Maps JavaScript API
- Supabase (Auth, Database)
- Vercel

## 시작하기

### 1. 환경변수 설정

`.env.local.example`을 복사해 `.env.local`을 만듭니다.

```bash
cp .env.local.example .env.local
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. Authentication > Providers에서 **Anonymous sign-ins** 활성화
3. SQL Editor에서 `supabase/migrations/001_initial_schema.sql` 실행

### 3. Naver Maps 설정

1. [Naver Cloud Platform](https://www.ncloud.com)에서 Maps API 애플리케이션 등록
2. Client ID를 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`에 설정

### 4. 개발 서버 실행

```bash
npm install
npm run dev
```

## 주요 기능

- 현재 위치에 발도장(핀) 생성 (100P, 24시간 노출)
- 반경 100m 내 1개 활성 핀 규칙
- 확률 점령 (10%, 25%, 50%, 75%)
- 주변 랜덤 포인트 생성 및 획득
- 익명 로그인 및 가입 보너스 1000P

## 배포 (Vercel)

Vercel에 연결 후 환경변수를 모두 설정하고 배포합니다.
