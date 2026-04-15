# 카톡 관계 분석기

카카오톡 대화 내보내기 txt 파일을 업로드하면 AI(Claude API)가 관계의 온도, 말투 성향, 대화 패턴 등 10개 항목을 분석하여 리포트를 제공하는 웹 서비스입니다.

## 로컬 개발 실행

### 사전 요구사항

- Node.js 18 이상
- Anthropic API 키 ([console.anthropic.com](https://console.anthropic.com) 에서 발급)

### 설치 및 실행

```bash
# 의존성 설치
npm run install:all

# 환경변수 설정
cp .env.example .env
# .env 파일을 열어 ANTHROPIC_API_KEY 값을 입력

# React 빌드
npm run build:client

# 서버 시작 (기본 포트 3001)
npm start
```

브라우저에서 `http://localhost:3001` 접속

## EC2 배포 가이드

### 1. EC2 인스턴스 준비

- Amazon Linux 2 또는 Ubuntu 22.04 권장
- 보안 그룹에서 HTTP(80) 포트 인바운드 허용

### 2. Node.js 설치

```bash
# Amazon Linux 2 기준
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Ubuntu 기준
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. PM2 설치

```bash
sudo npm install -g pm2
```

### 4. 프로젝트 배포

```bash
# 코드 클론
git clone <repository-url>
cd katalk-relationship-analyzer

# 의존성 설치 및 React 빌드
npm run build
```

### 5. 환경변수 설정

```bash
cp .env.example .env
nano .env  # ANTHROPIC_API_KEY 값 입력
```

### 6. 서버 시작

```bash
# 80 포트 사용을 위해 sudo 필요 (또는 authbind 사용)
sudo pm2 start ecosystem.config.js

# 서버 재부팅 시 자동 시작 등록
sudo pm2 startup
sudo pm2 save
```

### 7. 상태 확인

```bash
pm2 status
pm2 logs katalk-analyzer
```

## 환경변수

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API 인증 키. [console.anthropic.com](https://console.anthropic.com) 에서 발급 |
| `PORT` | ❌ | 서버 포트 (기본값: `3001`, EC2 배포 시 `80`) |
| `NODE_ENV` | ❌ | 실행 환경 (`production` 설정 시 CORS 비활성화) |
