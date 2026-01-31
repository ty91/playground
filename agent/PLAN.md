# Plan

## 요약
- 목표: pnpm 기반 LLM 에이전트 REPL
- 범위: 로컬 CLI 텍스트 대화
- 제약: Vercel AI SDK 사용, 스트리밍 필수, 도구/검색 확장 가능, 제공자 제한(OpenAI/Anthropic/Google)
- 인증: 제공자별 API 키 사용
- 런타임: Node.js

## 결정
- REPL UX: 종료 Ctrl+D, 오류 메시지 간결, 로그 저장 없음
- 모델: Google Gemini 3 Flash 고정, 모델 선택 불가
- 시스템 프롬프트: 하드코딩
- 호환성 스파이크: 생략
- 디렉토리 구조: src 중심 분리

## 단계
### 1) REPL UX 정의 (완료)
- 입력 규칙 정리
- 종료 규칙: Ctrl+D
- 오류 메시지: 간결
- 로그 저장: 없음
- 산출물: UX 메모

### 2) 요구사항 확정 (완료)
- 기본 모델: Google Gemini 3 Flash
- 모델 선택 규칙: 선택 불가
- 시스템 프롬프트: 하드코딩
- 산출물: 요구사항 메모

### 3) REPL 루프 구현(스텁)
- 입력 루프 및 종료 처리
- 에코/더미 출력으로 흐름 확인
- 오류 처리 정책 반영(간결)
- 산출물: 동작하는 스텁 REPL
- 구현 방식(세부)
  - 입력 소스: Node.js stdin 스트림 + 라인 버퍼링
  - 프롬프트: `> ` 고정 출력, 입력 전마다 출력
  - 종료/신호: Ctrl+D 또는 Ctrl+C 1회 입력 시 “한 번 더 누르면 종료합니다.” 안내, 2회 연속 시 종료
  - 입력 규칙: 빈 줄/공백만 입력 무시
  - 멀티라인: 미지원(단일 라인만)
  - 에코 출력: `user:` 접두어 + 입력 그대로 출력(스텁)
  - 오류 처리: try/catch, 에러 메시지 1줄만 출력
  - 상태 관리: 대화 히스토리 저장 안 함
  - 종료 코드: 정상 0, 오류 1

### 4) 아키텍처 설계
- 제공자 레지스트리 구조
- 환경 변수 로딩 방식
- 도구 호출 확장 지점 설계
- 산출물: 구조 메모
- 디렉토리 구조(초안)
  - /src/main.ts (entry)
  - /src/repl.ts (REPL loop)
  - /src/provider/index.ts (registry)
  - /src/provider/google.ts (google factory)
  - /src/config.ts (env validation)
  - /src/systemPrompt.ts (prompt const)
  - /src/stream.ts (stream output)
  - /src/tooling.ts (tool interfaces, stub)
- 구현 방식(세부)
  - 모듈 분리: entry/repl/provider/config/systemPrompt/tooling
  - 제공자 레지스트리: providerId → factory 매핑, 현재 google만 활성
  - 모델 고정: registry에 기본 모델 상수로 고정
  - 환경 변수: GOOGLE_API_KEY 필수, 기타 제공자는 확장 슬롯
  - 설정 로딩: 시작 시 필수 키 검증, 없으면 간결 오류
  - 시스템 프롬프트: 상수 문자열로 보관
  - 스트리밍 경로: REPL → provider → stream → stdout
  - 도구 확장: tool registry 인터페이스/자리만 정의(비활성)
  - 검색 확장: 미구현, 훅만 준비
  - 파일 크기: 500 LOC 넘으면 분리

### 5) 구현
- 스트리밍 출력 처리 연결
- 제공자 선택 로직 연결(고정 모델)
- 산출물: 초기 동작 버전
- 구현 방식(세부)
  - entry: REPL 시작, 종료 코드 처리
  - repl: 입력/프롬프트/종료 이중확인 처리
  - provider: google factory에서 모델/클라이언트 생성
  - stream: 토큰 스트림을 stdout에 즉시 출력
  - error: 간결 메시지 단일 라인, 내부 스택 숨김
  - config: GOOGLE_API_KEY 확인, 없으면 즉시 실패
  - systemPrompt: 상수 문자열 적용
  - tooling: 인터페이스만 두고 비활성

### 6) 검증
- Google 제공자 기준 간단 대화 확인
- 스트리밍 지연/오류 확인
- 산출물: 검증 메모
- 검증 시나리오(세부)
  - 입력/출력 흐름: 한 줄 입력 → 즉시 스트림 출력
  - 빈 줄 입력: 무시되는지 확인
  - Ctrl+D 1회: 안내 문구 출력
  - Ctrl+D 2회: 종료 코드 0
  - Ctrl+C 1회: 안내 문구 출력
  - Ctrl+C 2회: 종료 코드 0
  - API 키 누락: 간결 오류 1줄, 종료 코드 1
  - 스트림 실패: 간결 오류 1줄, REPL 계속/종료 정책 확인

## 리스크
- 제공자 모델명 정책 변경

## 미결정
- 없음
