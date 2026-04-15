# 구현 계획: 카톡 관계 분석기

## 개요

카카오톡 대화 내보내기 txt 파일을 업로드하면 AI(Claude API)가 10개 항목을 분석하여 리포트를 제공하는 웹 서비스를 구현한다. Node.js Express 백엔드와 React 프론트엔드를 단일 서버 아키텍처로 구성하며, EC2 배포를 위한 PM2 설정까지 포함한다.

## Tasks

- [x] 1. 프로젝트 초기 설정 및 핵심 인터페이스 정의
  - [x] 1.1 루트 `package.json` 생성 및 프로젝트 구조 설정
    - `server/`, `client/`, `tests/` 디렉토리 구조 생성
    - 루트 `package.json`에 빌드/시작 스크립트 정의
    - _요구사항: 15.1_

  - [x] 1.2 백엔드 `server/package.json` 생성 및 의존성 설치
    - express, multer, @anthropic-ai/sdk, cors 등 의존성 정의
    - jest, fast-check 테스트 의존성 정의
    - _요구사항: 14.1, 14.2_

  - [x] 1.3 에러 클래스 정의 (`server/errors/index.js`)
    - AppError 기본 클래스 및 FileValidationError, ParseError, AnalysisError, InternalError 하위 클래스 구현
    - 에러 코드와 HTTP 상태 코드 매핑
    - _요구사항: 1.3, 1.4, 2.5, 14.3, 14.4_

  - [x] 1.4 프론트엔드 React 프로젝트 초기화 (`client/`)
    - Create React App 또는 Vite로 React 프로젝트 생성
    - recharts, axios 등 의존성 추가
    - _요구사항: 13.3_

- [ ] 2. 카카오톡 파서 구현
  - [x] 2.1 카카오톡 파서 핵심 로직 구현 (`server/lib/parser.js`)
    - 날짜 헤더 파싱: `--------------- YYYY년 M월 D일 요일 ---------------`
    - 메시지 라인 파싱: `[발화자] [오전/오후 H:MM] 메시지 내용`
    - 타임스탬프 파싱 (오전/오후 → 24시간 변환)
    - 여러 줄 메시지 결합 로직
    - 시스템 메시지 구분 (입장, 퇴장, 사진, 이모티콘 등)
    - 유효하지 않은 형식 감지 및 ParseError 반환
    - participants, chatRoomName, period 추출
    - _요구사항: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.2 파서 속성 기반 테스트: 파싱 라운드트립 (`tests/property/parser.property.test.js`)
    - **Property 1: 파싱 라운드트립**
    - 유효한 대화_데이터를 카카오톡 텍스트 형식으로 직렬화 후 다시 파싱하면 원본과 동일
    - **검증 대상: 요구사항 2.6, 2.2, 2.3**

  - [ ]* 2.3 파서 속성 기반 테스트: 메시지 파싱 구조적 완전성 (`tests/property/parser.property.test.js`)
    - **Property 2: 메시지 파싱 구조적 완전성**
    - 모든 비-시스템 메시지는 비어있지 않은 sender, 유효한 timestamp, 비어있지 않은 content를 가짐
    - participants 배열은 모든 고유 발화자를 포함
    - **검증 대상: 요구사항 2.1**

  - [ ]* 2.4 파서 단위 테스트 (`tests/unit/parser.test.js`)
    - 시스템 메시지 구분 테스트
    - 유효하지 않은 형식 오류 테스트
    - 빈 파일, 날짜만 있는 파일 등 엣지 케이스
    - _요구사항: 2.4, 2.5_

- [ ] 3. 통계 계산 모듈 구현
  - [x] 3.1 통계 계산 핵심 로직 구현 (`server/lib/stats.js`)
    - calculateStats: 총 메시지 수, 대화 기간, 발화자별 메시지 수, 발화 비율 계산
    - findSessions: 30분 기준 대화 세션 분리
    - findGapPeriods: 48시간 이상 공백 기간 탐지
    - calculateFirstContactRatio: 세션별 먼저 연락한 발화자 비율 계산
    - _요구사항: 3.1, 4.1, 12.1_

  - [ ]* 3.2 통계 속성 기반 테스트: 먼저 연락 비율 불변 속성 (`tests/property/stats.property.test.js`)
    - **Property 3: 먼저 연락 비율 불변 속성**
    - 각 발화자 비율은 0~100 범위, 모든 비율 합은 100
    - 세션 0개인 경우 모든 비율은 0
    - **검증 대상: 요구사항 4.1**

  - [ ]* 3.3 통계 속성 기반 테스트: 공백 기간 탐지 정확성 (`tests/property/stats.property.test.js`)
    - **Property 4: 공백 기간 탐지 정확성**
    - 모든 공백 기간은 48시간 이상, 반환되지 않은 쌍은 48시간 미만
    - 공백 기간은 시간순 정렬
    - **검증 대상: 요구사항 12.1**

  - [ ]* 3.4 통계 단위 테스트 (`tests/unit/stats.test.js`)
    - 세션 분리 경계값 테스트 (정확히 30분, 29분, 31분)
    - 빈 메시지 목록 처리 테스트
    - 단일 발화자만 있는 경우 테스트
    - _요구사항: 4.1, 12.1_

- [ ] 4. 체크포인트 - 파서 및 통계 모듈 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

- [ ] 5. 분석 엔진 및 Claude API 클라이언트 구현
  - [x] 5.1 Claude API 클라이언트 구현 (`server/lib/claude-client.js`)
    - ANTHROPIC_API_KEY 환경변수에서 API 키 로드
    - claude-sonnet-4-20250514 모델, max_tokens 4096 설정
    - 60초 타임아웃, 최대 2회 재시도 (지수 백오프)
    - AnalysisError 에러 처리
    - _요구사항: 14.3, 15.2_

  - [x] 5.2 분석 엔진 구현 (`server/lib/analyzer.js`)
    - buildPrompt: 통계 데이터 + 대화 샘플(최근 500개 + 초반 100개)로 프롬프트 구성
    - parseClaudeResponse: Claude 응답을 AnalysisResult JSON으로 파싱
    - analyze: ParseResult + Stats → Claude API 호출 → AnalysisResult 반환
    - 10개 분석 항목 모두 포함 (핵심지표, 먼저연락비율, 주제분포, 말투분석(나/상대방), AI인사이트, WhoAmI, 관계종합점수, 재밌는포인트, 공백기간분석)
    - _요구사항: 3.1, 5.1, 6.1, 6.2, 7.1, 7.2, 8.1, 8.2, 9.1, 9.2, 10.1, 10.2, 11.1, 11.2, 12.2_

  - [ ] 5.3 분석 엔진 단위 테스트 (`tests/unit/analyzer.test.js`)
    - Claude API 응답 파싱 테스트 (정상 JSON, 비정상 응답)
    - 프롬프트 빌드 테스트 (메시지 샘플링 로직)
    - _요구사항: 3.1, 5.1_

- [ ] 6. 백엔드 API 서버 구현
  - [x] 6.1 Express 서버 및 미들웨어 설정 (`server/server.js`)
    - multer 파일 업로드 미들웨어 (메모리 스토리지, 10MB 제한)
    - 정적 파일 서빙 (client/build)
    - CORS 설정 (개발 환경)
    - 글로벌 에러 핸들러
    - _요구사항: 14.1, 15.1, 15.3_

  - [x] 6.2 분석 API 라우터 구현 (`server/routes/analyze.js`)
    - POST /api/analyze 엔드포인트
    - 파일 유효성 검증 (확장자, 크기)
    - 파서 → 통계 → 분석 엔진 파이프라인 연결
    - 에러별 적절한 HTTP 상태 코드 반환 (400, 413, 502, 500)
    - _요구사항: 14.1, 14.2, 14.3, 14.4_

  - [ ]* 6.3 API 통합 테스트 (`tests/integration/api.test.js`)
    - 유효한 txt 파일 업로드 → JSON 응답 (Claude API 모킹)
    - 잘못된 파일 형식 → 400 에러
    - 파일 크기 초과 → 413 에러
    - Claude API 실패 → 502 에러
    - _요구사항: 14.1, 14.2, 14.3, 14.4_

- [x] 7. 체크포인트 - 백엔드 전체 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

- [ ] 8. 프론트엔드 업로드 및 상태 관리 구현
  - [x] 8.1 App 컴포넌트 및 상태 관리 구현 (`client/src/App.jsx`)
    - AppState (upload/loading/report/error) 상태 관리
    - 페이지 전환 로직
    - _요구사항: 13.1, 13.2_

  - [x] 8.2 파일 업로드 페이지 구현 (`client/src/components/UploadPage.jsx`)
    - FileDropZone: 드래그앤드롭 + 파일 선택 버튼
    - 클라이언트 사이드 파일 유효성 검증 (txt 확장자, 10MB 크기 제한)
    - 오류 메시지 표시 ("txt 파일만 업로드 가능합니다", "파일 크기는 10MB 이하만 가능합니다")
    - 업로드 진행 상태 표시
    - _요구사항: 1.1, 1.2, 1.3, 1.4_

  - [x] 8.3 로딩 페이지 구현 (`client/src/components/LoadingPage.jsx`)
    - 분석 진행 중 프로그레스 바 또는 로딩 애니메이션
    - _요구사항: 13.2_

- [ ] 9. 프론트엔드 리포트 페이지 구현
  - [x] 9.1 리포트 페이지 레이아웃 구현 (`client/src/components/ReportPage.jsx`)
    - 10개 분석 항목을 섹션별로 배치하는 스크롤 가능한 레이아웃
    - 모바일(360px 이상) 및 데스크톱 반응형 레이아웃
    - _요구사항: 13.1, 13.3_

  - [x] 9.2 핵심 지표 카드 구현 (`client/src/components/SummaryCards.jsx`)
    - 총 메시지 수, 대화 기간, 관계 유형, 관계 온도 카드 표시
    - _요구사항: 3.1, 3.2_

  - [x] 9.3 먼저 연락 비율 차트 구현 (`client/src/components/FirstContactChart.jsx`)
    - Recharts 도넛 또는 막대 차트로 발화자별 먼저 연락 비율 표시
    - _요구사항: 4.1, 4.2_

  - [x] 9.4 대화 주제 분포 차트 구현 (`client/src/components/TopicChart.jsx`)
    - Recharts 차트로 주제별 비율 표시
    - _요구사항: 5.1, 5.2_

  - [x] 9.5 말투 분석 레이더 차트 구현 (`client/src/components/ToneRadarChart.jsx`)
    - 사용자와 상대방의 따뜻함/배려심/유머감각/적극성을 하나의 레이더 차트에 겹쳐서 비교 표시
    - 키워드 태그 나열
    - _요구사항: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

  - [x] 9.6 AI 인사이트 섹션 구현 (`client/src/components/AIInsights.jsx`)
    - 3개 이상의 인사이트 문장과 근거 패턴 요약 표시
    - _요구사항: 8.1, 8.2_

  - [x] 9.7 Who Am I 섹션 구현 (`client/src/components/WhoAmI.jsx`)
    - 상대방 입장에서 본 사용자 서술형 텍스트 및 근거 표시
    - _요구사항: 9.1, 9.2_

  - [x] 9.8 관계 종합 점수 게이지 구현 (`client/src/components/RelationshipGauge.jsx`)
    - 0~100 게이지 차트 또는 온도계 형태 시각화
    - 유형 라벨 (절친/친구/지인/연인/썸 등) 함께 표시
    - _요구사항: 10.1, 10.2, 10.3_

  - [x] 9.9 재밌는 포인트 섹션 구현 (`client/src/components/FunPoints.jsx`)
    - 독특한 패턴/에피소드 카드와 실제 대화 발췌 표시
    - _요구사항: 11.1, 11.2_

  - [x] 9.10 공백 기간 타임라인 구현 (`client/src/components/GapTimeline.jsx`)
    - 공백 기간을 타임라인 형태로 시각화
    - 각 공백 기간의 시작일, 종료일, 지속 일수, 전후 패턴 변화 표시
    - _요구사항: 12.1, 12.2, 12.3_

- [ ] 10. 체크포인트 - 프론트엔드 전체 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

- [ ] 11. 프론트엔드-백엔드 통합 및 배포 설정
  - [x] 11.1 프론트엔드-백엔드 연동 완성
    - API 호출 로직 (axios)으로 파일 업로드 → 분석 결과 수신 → 리포트 표시 파이프라인 완성
    - 에러 응답 처리 및 사용자 메시지 표시
    - "다시 시도" 버튼, 네트워크 오류 처리
    - _요구사항: 1.2, 13.1, 13.2, 14.2_

  - [x] 11.2 EC2 배포 설정
    - PM2 설정 파일 (`ecosystem.config.js`) 작성 (자동 재시작)
    - 루트 `package.json`에 빌드 스크립트 (React 빌드 + 서버 시작)
    - 환경변수 ANTHROPIC_API_KEY 설정 가이드
    - HTTP 80 포트 설정
    - _요구사항: 15.1, 15.2, 15.3, 15.4_

- [x] 12. 최종 체크포인트 - 전체 통합 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

## 참고 사항

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있다
- 각 태스크는 특정 요구사항을 참조하여 추적 가능하다
- 체크포인트에서 점진적 검증을 수행한다
- 속성 기반 테스트는 파서와 통계 모듈의 보편적 정확성을 검증한다
- 단위 테스트는 특정 예시와 엣지 케이스를 검증한다
