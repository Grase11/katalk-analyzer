# Requirements Document

## Introduction

카톡 관계 분석기 프로젝트를 현재 모놀리식 구조(Express 서버가 React 빌드 파일 서빙 + API 처리를 모두 담당)에서 명확한 2-Tier 클라이언트-서버(Client-Server) 아키텍처로 분리한다.

- Tier 1 (Client): React 앱이 독립적으로 빌드·배포되며, API 서버에 HTTP 요청을 보낸다.
- Tier 2 (Server): Express API 서버가 순수 REST API만 담당하며, 정적 파일 서빙을 제거한다.

현재 상태:
- `server/server.js`가 `express.static`으로 `client/build/`를 서빙하고, SPA 폴백(`app.get('*')`)까지 포함
- 클라이언트는 상대 경로(`/api/analyze`)로 API를 호출하며, 개발 시 Vite 프록시로 서버에 연결
- EC2(Amazon Linux 2023)에서 PM2로 단일 프로세스 실행, 포트 80으로 서비스 중

## Glossary

- **Client_App**: React(Vite) 기반 프론트엔드 애플리케이션. 독립적으로 빌드되어 정적 파일로 서빙된다.
- **API_Server**: Express 기반 백엔드 서버. REST API 엔드포인트만 제공하며 정적 파일 서빙을 수행하지 않는다.
- **API_Base_URL**: Client_App이 API_Server에 요청을 보낼 때 사용하는 기본 URL. 환경변수로 설정 가능하다.
- **CORS**: Cross-Origin Resource Sharing. Client_App과 API_Server가 서로 다른 오리진에서 동작할 때 필요한 HTTP 헤더 정책이다.
- **Static_File_Server**: Client_App의 빌드 결과물(HTML, CSS, JS)을 서빙하는 서버 또는 서비스이다.
- **SPA_Fallback**: Single Page Application에서 클라이언트 사이드 라우팅을 지원하기 위해 모든 경로 요청을 index.html로 리다이렉트하는 동작이다.
- **Health_Check_Endpoint**: API_Server의 상태를 확인하기 위한 경량 HTTP 엔드포인트이다.
- **PM2**: Node.js 프로세스 매니저. EC2에서 API_Server를 관리한다.

## Requirements

### Requirement 1: API 서버에서 정적 파일 서빙 제거

**User Story:** As a 개발자, I want API_Server가 순수 API 엔드포인트만 제공하도록, so that 서버의 책임이 명확히 분리되고 각 Tier를 독립적으로 배포할 수 있다.

#### Acceptance Criteria

1. THE API_Server SHALL serve only `/api/*` route endpoints and return no static file content
2. WHEN a non-API route is requested, THE API_Server SHALL respond with HTTP 404 status and a JSON error body
3. THE API_Server SHALL not contain `express.static` middleware for client build files
4. THE API_Server SHALL not contain SPA_Fallback route handling

### Requirement 2: CORS 설정

**User Story:** As a 개발자, I want API_Server가 Client_App의 오리진에서 오는 요청을 허용하도록, so that 분리된 Tier 간 HTTP 통신이 정상적으로 동작한다.

#### Acceptance Criteria

1. THE API_Server SHALL include CORS headers in all API responses
2. WHEN a request originates from an allowed origin, THE API_Server SHALL include `Access-Control-Allow-Origin` header with the requesting origin value
3. THE API_Server SHALL allow configuring permitted origins through an environment variable named `ALLOWED_ORIGINS`
4. WHEN `ALLOWED_ORIGINS` environment variable is not set, THE API_Server SHALL allow all origins in development mode and reject cross-origin requests in production mode
5. THE API_Server SHALL allow `Content-Type` and `multipart/form-data` in CORS preflight responses

### Requirement 3: 클라이언트 API Base URL 설정

**User Story:** As a 개발자, I want Client_App이 환경변수로 API_Server의 주소를 설정할 수 있도록, so that 개발·스테이징·프로덕션 환경에서 각각 다른 API 서버를 가리킬 수 있다.

#### Acceptance Criteria

1. THE Client_App SHALL read API_Base_URL from the `VITE_API_URL` environment variable
2. WHEN `VITE_API_URL` is not set, THE Client_App SHALL default to an empty string so that relative path requests are used
3. THE Client_App SHALL prepend API_Base_URL to all API request paths
4. WHEN the Client_App is built for production, THE Client_App SHALL embed the API_Base_URL value at build time

### Requirement 4: 클라이언트 독립 빌드 및 서빙

**User Story:** As a 개발자, I want Client_App이 API_Server와 독립적으로 빌드·서빙되도록, so that 프론트엔드와 백엔드를 각각 독립적으로 배포하고 스케일링할 수 있다.

#### Acceptance Criteria

1. THE Client_App SHALL produce a self-contained static build output in the `client/build/` directory using `npm run build`
2. THE Static_File_Server SHALL serve Client_App build files on a configurable port
3. THE Static_File_Server SHALL implement SPA_Fallback by returning `index.html` for all non-file requests
4. WHEN a user accesses the service URL, THE Static_File_Server SHALL serve the Client_App entry page

### Requirement 5: API 서버 Health Check 엔드포인트

**User Story:** As a 운영자, I want API_Server의 상태를 확인할 수 있는 엔드포인트가 있도록, so that 서버 모니터링과 배포 검증을 수행할 수 있다.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/health`, THE API_Server SHALL respond with HTTP 200 status
2. THE API_Server SHALL include `{ "status": "ok" }` in the health check response body
3. THE Health_Check_Endpoint SHALL respond within 500ms under normal operating conditions

### Requirement 6: PM2 설정 업데이트

**User Story:** As a 운영자, I want PM2가 API_Server와 Static_File_Server를 각각 독립 프로세스로 관리하도록, so that 각 Tier를 개별적으로 재시작하고 모니터링할 수 있다.

#### Acceptance Criteria

1. THE PM2 configuration SHALL define two separate process entries: one for API_Server and one for Static_File_Server
2. THE PM2 configuration SHALL assign distinct process names to API_Server and Static_File_Server
3. THE PM2 configuration SHALL assign different port numbers to API_Server and Static_File_Server
4. WHEN either process crashes, PM2 SHALL automatically restart the crashed process independently

### Requirement 7: 배포 스크립트 업데이트

**User Story:** As a 개발자, I want 배포 스크립트가 2-Tier 아키텍처에 맞게 업데이트되도록, so that 한 번의 배포 명령으로 두 Tier가 모두 올바르게 설정된다.

#### Acceptance Criteria

1. THE deploy setup script SHALL install dependencies for both Client_App and API_Server
2. THE deploy setup script SHALL build Client_App before starting the Static_File_Server
3. THE deploy setup script SHALL start both API_Server and Static_File_Server processes via PM2
4. THE deploy setup script SHALL configure port 80 for Static_File_Server and a separate port for API_Server

### Requirement 8: 개발 환경 프록시 유지

**User Story:** As a 개발자, I want 로컬 개발 시 Vite 프록시가 API_Server로 요청을 전달하도록, so that 개발 환경에서도 2-Tier 구조와 동일한 방식으로 API를 호출할 수 있다.

#### Acceptance Criteria

1. WHILE in development mode, THE Client_App Vite dev server SHALL proxy `/api/*` requests to the API_Server
2. THE Vite proxy target SHALL be configurable and default to `http://localhost:3001`
3. WHEN the API_Server is not running, THE Vite dev server SHALL return a proxy error response to the Client_App

### Requirement 9: EC2 서버 파일 정리

**User Story:** As a 운영자, I want 2-Tier 아키텍처 설정 완료 후 EC2 서버에 필요한 파일만 남기고 불필요한 파일을 정리하도록, so that 서버 환경이 깔끔하게 유지되고 보안 위험이 줄어든다.

#### Acceptance Criteria

1. AFTER deployment is complete, THE EC2 project directory SHALL contain only production-required files and directories
2. THE EC2 project directory SHALL NOT contain development-only files such as test directories, `.env.example`, `jest.config.js`, `test-claude.js`, or planning documents (`.png` files)
3. THE EC2 project directory SHALL NOT contain sensitive credential files such as `.pem` key files
4. THE cleanup process SHALL preserve `node_modules/`, `client/build/`, `server/`, `ecosystem.config.js`, `package.json`, and `deploy/` directories
5. THE cleanup process SHALL be documented as a step in the deploy script or as a separate cleanup script
