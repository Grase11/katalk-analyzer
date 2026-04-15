#!/bin/bash
# ============================================
# 02-setup-ec2.sh - EC2에서 실행하는 설치/배포 스크립트
# 사용법: sudo bash 02-setup-ec2.sh
# ============================================

set -e

APP_DIR="/home/ec2-user/environment/katalk-analyzer"

echo "=== 카톡 관계 분석기 - EC2 설치 및 배포 (2-Tier) ==="
echo ""

# OS 감지
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  OS="unknown"
fi

echo "감지된 OS: $OS"
echo ""

# ---- Step 1: Node.js 설치 ----
echo "[1/6] Node.js 설치 확인..."
if command -v node &> /dev/null; then
  NODE_VER=$(node -v)
  echo "  Node.js $NODE_VER 이미 설치됨"
else
  echo "  Node.js 설치 중..."
  if [ "$OS" = "amzn" ]; then
    # Amazon Linux
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
  else
    # Ubuntu/Debian
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
  echo "  Node.js $(node -v) 설치 완료"
fi

# ---- Step 2: PM2 설치 ----
echo "[2/6] PM2 설치 확인..."
if command -v pm2 &> /dev/null; then
  echo "  PM2 이미 설치됨"
else
  echo "  PM2 설치 중..."
  npm install -g pm2
  echo "  PM2 설치 완료"
fi

# ---- Step 3: 의존성 설치 + 클라이언트 빌드 ----
echo "[3/6] 의존성 설치 및 클라이언트 빌드..."
cd $APP_DIR
npm run install:all
echo "  의존성 설치 완료"

echo "  클라이언트 빌드 중..."
npm run build:client
echo "  클라이언트 빌드 완료"

# ---- Step 4: PM2 프로세스 시작 ----
echo "[4/6] PM2로 서버 시작 (2-Tier)..."
cd $APP_DIR

# 기존 프로세스 모두 중지/삭제
pm2 delete katalk-analyzer 2>/dev/null || true
pm2 delete katalk-static 2>/dev/null || true
pm2 delete katalk-api 2>/dev/null || true

# ecosystem.config.js로 두 프로세스 시작
pm2 start ecosystem.config.js
pm2 save
pm2 startup 2>/dev/null || true

# ---- Step 5: 불필요 파일 정리 ----
echo "[5/6] 개발 전용 파일 정리..."
cd $APP_DIR
rm -rf tests/
rm -f jest.config.js
rm -f test-claude.js
rm -f *.png
rm -f .env.example
rm -rf .kiro/
rm -rf .vscode/
rm -f README.md
echo "  정리 완료"

# ---- Step 6: 상태 확인 ----
echo "[6/6] 배포 상태 확인..."
echo ""
pm2 status

echo ""
echo "========================================="
echo "✅ 2-Tier 배포 완료!"
echo "========================================="
echo ""
echo "서비스 URL:  http://23.22.160.220:7942  (Static File Server, 포트 7942)"
echo "API URL:     http://23.22.160.220:3000  (API Server, 포트 3000)"
echo ""
echo "유용한 명령어:"
echo "  pm2 status          - 프로세스 상태 확인"
echo "  pm2 logs            - 전체 로그 확인"
echo "  pm2 logs katalk-static  - Static Server 로그"
echo "  pm2 logs katalk-api     - API Server 로그"
echo "  pm2 restart all     - 전체 재시작"
echo ""
echo "⚠️  확인사항:"
echo "  1. AWS 보안그룹에서 인바운드 TCP 7942, 3000 포트가 열려있는지 확인"
echo "  2. ecosystem.config.js에 ALLOWED_ORIGINS가 올바르게 설정되어 있는지 확인"
echo "========================================="
