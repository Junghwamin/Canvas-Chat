# RAG Document Q&A + Canvas Chat Service

문서 기반 AI 질의응답 서비스 + 무한 캔버스 기반 멀티 LLM 채팅 플랫폼

---

## 🎯 주요 기능

### 📄 RAG 문서 Q&A (`/documents`)
- **문서 업로드**: PDF, Word, 엑셀(.xlsx, .xls), 텍스트, 마크다운 지원
- **AI 질의응답**: 업로드한 문서 기반으로 자연어 질문에 답변
- **출처 표시**: 답변의 근거가 되는 문서명, 페이지, 발췌문, 파일 경로 표시
- **스트리밍 응답**: 실시간 타이핑 효과
- **대화 히스토리**: 이전 대화 맥락을 이해하여 후속 질문 대응 (최근 10개)
- **Chain of Thought**: 5단계 추론 과정으로 정확한 답변 생성
- **Few Shot Learning**: 예시 기반 답변 패턴 적용
- **📊 통계 내보내기** *(NEW)*: AI 응답에서 통계 데이터 자동 감지 → Excel/CSV 다운로드, 차트 시각화

### 🎨 Canvas Chat (`/canvas`)
- **무한 캔버스**: React Flow 기반 비선형 대화 UI
- **멀티 LLM**: OpenAI GPT-4o, Google Gemini 지원
- **노드 기반 대화**: 트리 구조의 대화 관리
- **로컬 저장**: IndexedDB 기반 데이터 영속성
- **API 키 관리**: 사용자별 API 키 설정
- **🤖 AI 정리** *(NEW)*: 대화를 AI가 자동으로 구조화하여 정리 (핵심 내용, 주요 논점, 결론)
- **📤 문서 전송** *(NEW)*: Canvas 대화를 문서 Q&A로 바로 전송하여 RAG 검색 가능

---

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| **Backend** | Python, FastAPI, LangChain |
| **AI/LLM** | OpenAI GPT-4o, Google Gemini, text-embedding-3-small |
| **Vector DB** | ChromaDB |
| **Database** | SQLite, SQLAlchemy |
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS |
| **Canvas UI** | React Flow, Zustand, Dexie.js |
| **문서 처리** | pypdf, docx2txt, pandas, openpyxl, xlrd |
| **차트/내보내기** | Recharts, xlsx, html2canvas |

---

## 🚀 빠른 시작

### 1. 사전 요구사항

- Python 3.10+
- Node.js 18+
- OpenAI API Key

### 2. 설치

```bash
# 저장소 클론
git clone https://github.com/your-repo/rag-pdf.git
cd rag-pdf

# 백엔드 설정
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 환경 변수 설정
# .env 파일 생성 후 OPENAI_API_KEY 입력

# 프론트엔드 설정
cd ../frontend
npm install
```

### 3. 실행

```bash
# 백엔드 서버 (터미널 1)
cd backend
python -m uvicorn app.main:app --reload --port 8000

# 프론트엔드 서버 (터미널 2)
cd frontend
npm run dev
```

### 4. 접속

| 페이지 | URL |
|--------|-----|
| 홈 | http://localhost:3000 |
| 문서 Q&A | http://localhost:3000/documents |
| Canvas Chat | http://localhost:3000/canvas |
| API 문서 (Swagger) | http://localhost:8000/docs |

---

## 📁 프로젝트 구조

```
Rag_PDF/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/     # API 라우트
│   │   │   ├── chat.py        # RAG 채팅 API
│   │   │   └── documents.py   # 문서 관리 API
│   │   ├── core/rag/          # RAG 핵심 로직
│   │   │   ├── rag_chain.py   # CoT, Few Shot, 히스토리
│   │   │   ├── vector_store.py
│   │   │   └── document_loader.py
│   │   └── db/                # 데이터베이스
│   └── data/                  # 저장소
│       ├── chroma_db/         # 벡터 DB
│       └── documents/         # 업로드 파일
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx       # 홈
│       │   ├── documents/     # RAG Q&A 페이지
│       │   └── canvas/        # Canvas Chat 페이지
│       ├── components/
│       │   └── canvas-org/    # Canvas 컴포넌트
│       ├── stores/            # Zustand 상태관리
│       ├── services/          # LLM/파일 서비스
│       └── db/                # IndexedDB (Dexie)
├── docs/                      # 문서
└── CLAUDE.md                  # 업데이트 기록
```

---

## 🔧 환경 변수

```bash
# backend/.env
OPENAI_API_KEY=sk-proj-xxxxx    # OpenAI API 키 (필수)
PROJECT_NAME="RAG Document Q&A"
```

---

## 📡 API 사용 예시

### 문서 업로드

```bash
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -F "file=@document.pdf"
```

### RAG 질의응답 (대화 히스토리 포함)

```bash
curl -X POST "http://localhost:8000/api/v1/chat/query" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "이 문서의 핵심 내용은?",
    "chat_history": [
      {"role": "user", "content": "안녕하세요"},
      {"role": "assistant", "content": "안녕하세요! 무엇을 도와드릴까요?"}
    ]
  }'
```

### 문서 삭제

```bash
curl -X DELETE "http://localhost:8000/api/v1/documents/5"
```

### 텍스트 문서 업로드 (Canvas → Documents 전송용)

```bash
curl -X POST "http://localhost:8000/api/v1/documents/upload-text" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 캔버스 대화 내용\n\n## Conversation...",
    "filename": "my-canvas.md",
    "source_type": "canvas",
    "metadata": {
      "canvas_id": "uuid",
      "canvas_name": "캔버스 이름"
    }
  }'
```

---

## 📚 문서

- [CLAUDE.md](./CLAUDE.md) - 업데이트 기록
- [PRD (제품 요구사항)](./docs/PRD.md)
- [기술 설계서](./docs/TECHNICAL_SPEC.md)
- [API 명세서](./docs/API_SPEC.md)

---

## 📜 라이선스

MIT License

---

## 🤝 기여

이슈와 PR을 환영합니다!
