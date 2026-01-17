# CLAUDE.md - RAG_PDF 프로젝트 업데이트 기록

## 업데이트 일자: 2026-01-17

---

## 1. Canvas Chat 통합

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

## 2. RAG 문서 Q&A 기능 강화

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

## 3. Agent 개념 적용 (RAG 개선)

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

## 4. 버그 수정 및 최적화

### 주요 수정 사항
- **한글 인코딩**: 텍스트 파일 UTF-8 인코딩 명시
- **데이터 초기화**: 꼬인 벡터 DB 초기화 및 복구 가이드 제공
- **할루시네이션 오판 해결**: 동일 파일 중복 업로드 시 정확한 분석 확인
- **SSR 에러**: pdfjs-dist lazy loading 적용

---

## 5. 설치된 패키지

### Backend
```bash
pip install langchain-chroma pypdf xlrd pandas
```

### Frontend
```bash
npm install @xyflow/react zustand dexie openai @google/generative-ai react-markdown highlight.js nanoid lucide-react pdfjs-dist
```

---

## 6. 실행 방법

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
