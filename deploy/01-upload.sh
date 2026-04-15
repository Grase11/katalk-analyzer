#!/bin/bash
# ============================================
# 01-upload.sh - 로컬에서 EC2로 파일 전송
# 사용법: bash deploy/01-upload.sh
# ============================================

set -e

HOST="kmuai-project-team1"
REMOTE_DIR="/home/ec2-user/environment/katalk-analyzer"

echo "=== 카톡 관계 분석기 - EC2 파일 전송 ==="
echo "대상: $HOST:$REMOTE_DIR"
echo ""

# EC2에 디렉토리 생성
echo "[1/3] EC2에 디렉토리 생성..."
ssh $HOST "mkdir -p $REMOTE_DIR"

# rsync로 파일 전송 (불필요 파일 제외)
echo "[2/3] 파일 전송 중... (node_modules, 개발 전용 파일 제외)"
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'client/build' \
  --exclude '*.pem' \
  --exclude 'deploy' \
  --exclude 'tests/' \
  --exclude 'jest.config.js' \
  --exclude 'test-claude.js' \
  --exclude '*.png' \
  --exclude '.env.example' \
  ./ $HOST:$REMOTE_DIR/

echo "[3/3] 배포 스크립트 전송..."
scp deploy/02-setup-ec2.sh $HOST:$REMOTE_DIR/

echo ""
echo "✅ 파일 전송 완료!"
echo ""
echo "다음 단계: EC2에 접속해서 설치 스크립트 실행"
echo "  ssh $HOST"
echo "  cd $REMOTE_DIR"
echo "  sudo bash 02-setup-ec2.sh"
echo ""
echo "배포 완료 후 접속: http://23.22.160.220:7942"
