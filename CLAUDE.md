# CLAUDE.md - RAG_PDF 프로젝트 업데이트 기록

> **⚠️ 중요**: 이 프로젝트의 모든 변경 사항, 에러, 버그 수정은 반드시 이 파일에 기록되어야 합니다. 자세한 규칙은 `CONTRIBUTING.md`를 참고하세요.

## 업데이트 일자: 2026-01-19

---

## 0. Canvas AI 정리 + Documents 전송 + 통계 Excel/그래프 기능 추가 (2026-01-19)

### 🤖 Feature 1: AI 정리 버튼 (Canvas ExportModal)
Canvas 대화를 AI가 자동으로 구조화하여 정리하는 기능

**수정된 파일:**
- `frontend/src/services/llmService.ts` - `generateConversationSummary()` 함수 추가
- `frontend/src/components/canvas-org/ui/ExportModal.tsx` - AI 정리 포맷 및 UI 추가

**기능:**
- 내보내기 형식에 "AI 정리" 옵션 추가 (JSON, Markdown, AI 정리)
- 스트리밍 방식으로 AI 요약 실시간 표시
- 요약 결과: 핵심 내용, 주요 논점, 결론, 추가 인사이트
- 클립보드 복사 기능

### 📤 Feature 2: Canvas → Documents 전송
Canvas 대화를 문서 Q&A로 전송하여 RAG 검색 가능하게 하는 기능

**수정된 파일:**
- `backend/app/api/endpoints/documents.py` - `/upload-text` 엔드포인트 추가
- `frontend/src/components/canvas-org/ui/ExportModal.tsx` - "문서 Q&A로 전송" 버튼 추가

**새 API 엔드포인트:**
```
POST /api/v1/documents/upload-text
{
  "content": "마크다운 내용",
  "filename": "파일명.md",
  "source_type": "canvas",
  "metadata": { "canvas_id": "...", "canvas_name": "..." }
}
```

### 📊 Feature 3: 통계 Excel/그래프 내보내기
Documents Q&A 응답에서 통계 데이터를 감지하여 Excel/차트로 내보내기

**신규 생성 파일:**
- `frontend/src/utils/statisticsParser.ts` - 통계 데이터 파싱 (테이블, 리스트, 퍼센트, 비교 데이터)
- `frontend/src/services/exportService.ts` - Excel/CSV 내보내기, 차트 이미지 저장
- `frontend/src/components/documents/ChartModal.tsx` - Recharts 기반 차트 모달 (막대, 선, 파이, 영역)
- `frontend/src/components/documents/StatisticsPanel.tsx` - 통계 패널 (펼치기/접기, 내보내기 버튼)

**수정된 파일:**
- `frontend/src/app/documents/page.tsx` - 통계 감지 및 패널/모달 통합

**기능:**
- AI 응답에서 자동으로 통계 데이터 감지 (마크다운 테이블, 숫자 리스트, 퍼센트 등)
- Excel (.xlsx), CSV 다운로드
- 4종류 차트 시각화 (막대, 선, 파이, 영역)
- 차트 PNG/JPEG 이미지 저장
- 클립보드 복사 (탭 구분 형식)

### 추가된 패키지
```bash
npm install xlsx recharts html2canvas
```

---

## 업데이트 일자: 2026-01-18

---

## 1. Vercel React Best Practices 스킬 기반 최적화 (2026-01-18)

### 스킬 설치
```bash
npx skillscokac -d vercel-react-best-practices "~/.claude/skills"
```

### 보안 패치 (Critical)

#### API 키 노출 수정
- **문제**: 클라이언트에서 `dangerouslyAllowBrowser: true`로 API 키 직접 사용
- **해결**: 서버 API Route Handler 생성하여 프록시 처리
  - `frontend/src/app/api/chat/route.ts` - OpenAI 프록시
  - `frontend/src/app/api/chat/gemini/route.ts` - Gemini 프록시
  - `frontend/src/services/llmService.ts` - 서버 API 호출로 변경

#### XSS 취약점 수정
- **문제**: `innerHTML` 직접 사용
- **해결**: DOMPurify로 sanitize (동적 import로 SSR 호환)
  - `frontend/src/components/canvas-org/ui/MarkdownRenderer.tsx`

### 성능 최적화 (High)

#### Canvas.tsx Map 기반 룩업
- **문제**: `countDescendants` 재귀 함수가 O(n^2)
- **해결**: `childrenMap`과 `descendantCountCache` useMemo로 O(n)으로 최적화
  - `frontend/src/components/canvas-org/Canvas.tsx`

#### InputPanel.tsx 병렬 처리
- **문제**: 첨부파일 순차 처리
- **해결**: `Promise.all(files.map(...))`로 병렬 처리
  - `frontend/src/components/canvas-org/ui/InputPanel.tsx`

#### db/index.ts getPathToRoot 최적화
- **문제**: N번 DB 쿼리 + Array.unshift O(n)
- **해결**: 1번 쿼리 + Map 룩업 + push/reverse
  - `frontend/src/db/index.ts`

#### documents/page.tsx 스트림 처리 최적화
- **문제**: `fullText +=` 문자열 연결 O(n^2)
- **해결**: `chunks.push()` + `join()` O(n)
  - `frontend/src/app/documents/page.tsx`

### 레거시 파일 삭제
- `frontend/src/components/canvas-original/` (삭제)
- `frontend/src/components/canvas/` (삭제)
- `frontend/src/db/database.ts` (삭제)
- `frontend/src/types/canvas.ts` (삭제)
- `frontend/src/utils/canvas.ts` (삭제)

### 추가된 패키지
```bash
npm install dompurify @types/dompurify
```

---

## 업데이트 일자: 2026-01-17

---

## 1. GitHub 배포 및 문서화 강화

### 🚀 배포 완료
- **저장소**: [https://github.com/Junghwamin/Canvas-Chat](https://github.com/Junghwamin/Canvas-Chat)
- **보안 조치**:
  - `frontend/src/components/canvas/TestInit.tsx` 하드코딩 API 키 제거
  - Git 히스토리 초기화 (Secrets Scrubbing)
  - `.gitignore` 강화 및 `.env` 파일 제외
- **구조 개선**: `backend/`와 `frontend/` 모노레포 구조로 정리 및 레거시 파일 삭제

### 📝 문서화 가이드라인 추가
- `CONTRIBUTING.md` 생성: 에이전트 작업 지침 및 로그 기록 규칙 정의
- `CLAUDE.md`를 갱신 로그(Changelog)의 중심으로 설정

---

## 2. Canvas Chat 통합

### 추가된 기능
- React Flow 기반 무한 캔버스 UI
- 멀티 LLM 지원 (OpenAI GPT-4o, Google Gemini)
- 노드 기반 비선형 대화 구조
- IndexedDB 기반 데이터 영속성

### 변경된 파일
- `frontend/src/app/canvas/page.tsx` - Canvas Chat 메인 페이지
- `frontend/src/components/canvas-org/` - Canvas 컴포넌트들
- `frontend/src/stores/canvasStore.ts` - Zustand 상태 관리
- `frontend/src/services/` - LLM 및 파일 서비스
- `frontend/src/db/database.ts` - Dexie.js IndexedDB 설정

---

## 3. RAG 문서 Q&A 기능 강화

### 📄 엑셀 파일 지원 추가
- `.xlsx` 및 `.xls` (구형 엑셀) 파일 지원
- pandas 엔진 사용으로 완벽한 호환성
- 시트별 자동 분할 처리
- `backend/app/core/rag/document_loader.py`에 `ExcelLoader` 클래스 추가

### 🗑️ 문서 삭제 기능 개선
- DB 레코드 삭제 시 **ChromaDB 벡터 데이터**도 함께 삭제되도록 수정
- `backend/app/core/rag/vector_store.py`에 `delete_by_document_id` 메서드 추가

### 📚 출처 표시 상세화
- 답변 출처에 **파일 경로(file_path)** 및 **발췌문(excerpt)** 포함
- `backend/app/core/rag/rag_chain.py` 수정

---

## 4. Agent 개념 적용 (RAG 개선)

### Chain of Thought (사고의 연쇄)
5단계 사고 과정 프롬프트 추가:
1. 질문 분석
2. 맥락 확인
3. 문서 검색
4. 정보 종합
5. 답변 생성

### Conversation History (대화 히스토리)
- 최근 10개 대화 맥락 유지

### Few Shot Learning
- 좋은 답변 예시 패턴 적용

---

## 5. 버그 수정 및 최적화

### Troubleshooting
- **문제**: 한글 문서가 깨져서 보이는 현상
  - **원인**: `TextLoader` 기본 인코딩 문제
  - **해결**: `encoding='utf-8'` 명시적 설정 (`document_loader.py`)
- **문제**: SSR 환경에서 `DOMMatrix is not defined` 에러
  - **원인**: `pdfjs-dist`가 서버 사이드에서 로드됨
  - **해결**: Dynamic Import 및 Lazy Loading 적용 (`fileService.ts`)
- **문제**: 동일 엑셀 파일 5개 중복 업로드를 할루시네이션으로 오판
  - **해결**: 파일 크기/청크 수 비교를 통해 실제로 동일 파일임을 검증

---

## 6. 설치된 패키지

### Backend
```bash
pip install langchain-chroma pypdf xlrd pandas
```

### Frontend
```bash
npm install @xyflow/react zustand dexie openai @google/generative-ai react-markdown highlight.js nanoid lucide-react pdfjs-dist
```

---

## 7. 실행 방법

### Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

### 접속 URL
- 문서 Q&A: http://localhost:3000/documents
- Canvas Chat: http://localhost:3000/canvas
- API 문서: http://localhost:8000/docs

