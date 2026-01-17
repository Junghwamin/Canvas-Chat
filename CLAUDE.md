# CLAUDE.md - RAG_PDF 프로젝트 업데이트 기록

> **⚠️ 중요**: 이 프로젝트의 모든 변경 사항, 에러, 버그 수정은 반드시 이 파일에 기록되어야 합니다. 자세한 규칙은 `CONTRIBUTING.md`를 참고하세요.

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

