# Implementation Plan: 2-Tier 클라이언트-서버 아키텍처

## Overview

모놀리식 Express 서버를 API Server와 Static File Server로 분리하고, 클라이언트 API URL 설정, PM2 듀얼 프로세스 구성, 배포 스크립트 업데이트를 순차적으로 구현한다. 각 단계는 이전 단계 위에 점진적으로 빌드되며, 마지막에 전체를 통합한다.

## Tasks

- [x] 1. API Server 리팩토링 (`server/server.js`)
  - [x] 1.1 정적 파일 서빙 및 SPA 폴백 제거
    - `express.static` 미들웨어 제거 (`app.use(express.static(...))`)
    - SPA 폴백 라우트 제거 (`app.get('*', ...)`)
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 1.2 CORS 설정을 환경변수 기반으로 변경
    - 기존 `if (process.env.NODE_ENV !== 'production') { app.use(cors()); }` 제거
    - `ALLOWED_ORIGINS` 환경변수에서 쉼표 구분 오리진 목록 파싱
    - `cors()` 미들웨어에 커스텀 `origin` 콜백 적용
    - 개발 모드(NODE_ENV !== 'production') + ALLOWED_ORIGINS 미설정 시 전체 허용
    - 프로덕션 모드에서 ALLOWED_ORIGINS에 포함된 오리진만 허용
    - origin이 없는 요청(서버 간 통신)은 항상 허용
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.3 Health check 엔드포인트 추가
    - `GET /api/health` → `{ status: "ok" }` (HTTP 200)
    - API 라우터(`app.use('/api', analyzeRouter)`) 앞에 배치
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 1.4 비-API 라우트 404 JSON 응답 추가
    - 글로벌 에러 핸들러 앞에 catch-all 미들웨어 추가
    - `res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API endpoint not found' } })`
    - _Requirements: 1.2_

  - [ ]* 1.5 Property 1: 비-API 라우트 404 응답 속성 테스트 작성
    - **Property 1: 비-API 라우트 404 응답**
    - `tests/property/api-server-404.property.test.js` 생성
    - `fast-check`으로 `/api/`로 시작하지 않는 임의의 URL 경로 생성
    - API Server에 요청 시 HTTP 404 + `{ error: { code, message } }` JSON 응답 검증
    - 최소 100회 반복
    - **Validates: Requirements 1.2**

  - [ ]* 1.6 Property 2: CORS 허용 오리진 매칭 속성 테스트 작성
    - **Property 2: CORS 허용 오리진 매칭**
    - `tests/property/cors-origin.property.test.js` 생성
    - `fast-check`으로 임의의 오리진 목록 생성 → `ALLOWED_ORIGINS` 설정
    - 목록 내 오리진으로 요청 시 `Access-Control-Allow-Origin` 헤더 매칭 검증
    - 최소 100회 반복
    - **Validates: Requirements 2.2, 2.3**

- [x] 2. Checkpoint - API Server 변경 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Static File Server 생성 (`server/static-server.js`)
  - [x] 3.1 Static File Server 구현
    - `server/static-server.js` 신규 생성
    - `client/build/` 디렉토리 정적 파일 서빙 (`express.static`)
    - SPA 폴백: 파일이 아닌 모든 경로에 `index.html` 반환
    - `PORT` 환경변수 (기본값 80)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 3.2 Property 3: SPA 폴백 속성 테스트 작성
    - **Property 3: SPA 폴백**
    - `tests/property/spa-fallback.property.test.js` 생성
    - `fast-check`으로 파일 확장자가 없는 임의의 URL 경로 생성
    - Static File Server에 요청 시 `index.html` 내용 반환 검증
    - 최소 100회 반복
    - **Validates: Requirements 4.3**

- [x] 4. 클라이언트 API Base URL 설정 (`client/src/App.jsx`)
  - [x] 4.1 API Base URL 환경변수 적용
    - `const API_BASE_URL = import.meta.env.VITE_API_URL || ''` 추가
    - `axios.post('/api/analyze', ...)` → `axios.post(`${API_BASE_URL}/api/analyze`, ...)` 변경
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.2 Vite 프록시 설정 유지 확인
    - `client/vite.config.js`의 기존 프록시 설정이 그대로 유지되는지 확인
    - 개발 환경에서 `VITE_API_URL` 미설정 시 상대 경로 → Vite 프록시 동작 보장
    - _Requirements: 8.1, 8.2_

- [x] 5. Checkpoint - 클라이언트 변경 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. PM2 설정 업데이트 (`ecosystem.config.js`)
  - [x] 6.1 PM2 듀얼 프로세스 설정
    - 기존 단일 `katalk-analyzer` 프로세스를 두 개로 분리
    - `katalk-static`: `server/static-server.js`, 포트 80
    - `katalk-api`: `server/server.js`, 포트 3001, `ALLOWED_ORIGINS` 설정
    - 두 프로세스 모두 `autorestart: true`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. 배포 스크립트 업데이트
  - [x] 7.1 업로드 스크립트 수정 (`deploy/01-upload.sh`)
    - rsync 제외 목록에 개발 전용 파일 추가: `tests/`, `jest.config.js`, `test-claude.js`, `*.png`, `.env.example`
    - _Requirements: 9.2, 9.3_

  - [x] 7.2 EC2 설치/배포 스크립트 수정 (`deploy/02-setup-ec2.sh`)
    - 클라이언트 빌드 시 `VITE_API_URL` 환경변수 주입
    - PM2에서 기존 단일 프로세스(`katalk-analyzer`) 삭제 후 `ecosystem.config.js`로 두 프로세스 시작
    - 배포 완료 후 불필요 파일 정리 단계 추가 (테스트, 기획서 이미지, .env.example 등)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 8. Final checkpoint - 전체 통합 검증
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있음
- 각 태스크는 특정 요구사항을 참조하여 추적 가능
- 속성 기반 테스트는 `fast-check` 라이브러리 사용 (이미 `server/devDependencies`에 설치됨)
- 개발 환경에서는 Vite 프록시가 API 요청을 전달하므로 `VITE_API_URL` 설정 불필요
