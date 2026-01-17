# Technical Specification
# RAG Document Q&A Service

---

## 1. 시스템 아키텍처

### 1.1 전체 아키텍처
```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  [Web Browser]     [Mobile App]     [CLI Tool]     [API Client] │
│       ↓                 ↓               ↓               ↓       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend (Next.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  - React Components        - Tailwind CSS                       │
│  - API Client (axios)      - Real-time Streaming (SSE)          │
│  - Auth State (JWT)        - File Upload                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   Auth   │  │ Document │  │  Query   │  │  Admin   │        │
│  │  Router  │  │  Router  │  │  Router  │  │  Router  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│  ┌────▼─────────────▼─────────────▼─────────────▼────┐         │
│  │                   Core Services                    │         │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │         │
│  │  │  Document   │  │     RAG     │  │  Vector   │  │         │
│  │  │   Loader    │  │    Chain    │  │   Store   │  │         │
│  │  └─────────────┘  └─────────────┘  └───────────┘  │         │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │         │
│  │  │    OCR      │  │   Speech    │  │ Streaming │  │         │
│  │  │  Service    │  │   Service   │  │  Service  │  │         │
│  │  └─────────────┘  └─────────────┘  └───────────┘  │         │
│  └───────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   ChromaDB   │  │   SQLite     │  │  File System │          │
│  │  (Vectors)   │  │  (Metadata)  │  │  (Documents) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     External Services                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  OpenAI API  │  │   Whisper    │  │   EasyOCR    │          │
│  │  (LLM/Embed) │  │    (STT)     │  │    (OCR)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 데이터 흐름

#### 문서 업로드 흐름
```
[파일 업로드]
    → [파일 유효성 검사]
    → [파일 저장 (File System)]
    → [텍스트 추출 (PyPDF/Docx2txt/OCR)]
    → [텍스트 청킹 (RecursiveCharacterTextSplitter)]
    → [임베딩 생성 (OpenAI)]
    → [벡터 저장 (ChromaDB)]
    → [메타데이터 저장 (SQLite)]
    → [완료 응답]
```

#### 질의응답 흐름
```
[질문 입력]
    → [질문 임베딩 (OpenAI)]
    → [유사 문서 검색 (ChromaDB, top_k=5)]
    → [컨텍스트 구성 (관련 청크 + 대화 히스토리)]
    → [프롬프트 생성]
    → [LLM 호출 (GPT-4o)]
    → [스트리밍 응답 (SSE)]
    → [출처 정보 첨부]
    → [대화 히스토리 저장]
```

---

## 2. 기술 스택 상세

### 2.1 Backend

| 카테고리 | 기술 | 버전 | 용도 |
|---------|------|------|------|
| Framework | FastAPI | 0.109+ | REST API 서버 |
| ASGI Server | Uvicorn | 0.27+ | 비동기 서버 |
| LLM Framework | LangChain | 0.1+ | RAG 파이프라인 |
| Vector DB | ChromaDB | 0.4+ | 벡터 저장/검색 |
| RDBMS | SQLite | 3.x | 메타데이터 저장 |
| ORM | SQLAlchemy | 2.0+ | 데이터베이스 추상화 |
| Auth | python-jose | 3.3+ | JWT 토큰 |
| Password | passlib | 1.7+ | bcrypt 해싱 |

### 2.2 AI/ML

| 카테고리 | 기술 | 용도 |
|---------|------|------|
| LLM | OpenAI GPT-4o | 답변 생성 |
| Embedding | text-embedding-3-small | 텍스트 임베딩 |
| OCR | EasyOCR | 이미지 텍스트 추출 |
| STT | OpenAI Whisper | 음성 텍스트 변환 |

### 2.3 Frontend

| 카테고리 | 기술 | 버전 | 용도 |
|---------|------|------|------|
| Framework | Next.js | 14+ | React 프레임워크 |
| Styling | Tailwind CSS | 3.x | 스타일링 |
| UI Components | shadcn/ui | - | 컴포넌트 라이브러리 |
| HTTP Client | axios | 1.x | API 호출 |
| State | React Context | - | 전역 상태 관리 |

### 2.4 DevOps

| 카테고리 | 기술 | 용도 |
|---------|------|------|
| Container | Docker | 컨테이너화 |
| Orchestration | docker-compose | 멀티 컨테이너 관리 |
| CI/CD | GitHub Actions | 자동 배포 (선택) |

---

## 3. 데이터베이스 설계

### 3.1 SQLite 스키마

#### Users 테이블
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Documents 테이블
```sql
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    collection_id INTEGER,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    chunk_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (collection_id) REFERENCES collections(id)
);
```

#### DocumentVersions 테이블
```sql
CREATE TABLE document_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id)
);
```

#### Collections 테이블
```sql
CREATE TABLE collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Conversations 테이블
```sql
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Messages 테이블
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    sources JSON,  -- [{"document": "file.pdf", "page": 1}, ...]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

#### UsageStats 테이블
```sql
CREATE TABLE usage_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL,  -- 'query', 'upload', 'login'
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3.2 ChromaDB 컬렉션 구조

```python
# 벡터 저장 구조
{
    "ids": ["doc1_chunk1", "doc1_chunk2", ...],
    "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...], ...],
    "documents": ["청크 텍스트 1", "청크 텍스트 2", ...],
    "metadatas": [
        {
            "document_id": 1,
            "user_id": 1,
            "collection_id": 1,
            "filename": "document.pdf",
            "page": 1,
            "chunk_index": 0
        },
        ...
    ]
}
```

---

## 4. 핵심 모듈 설계

### 4.1 Document Loader (`document_loader.py`)

```python
from abc import ABC, abstractmethod
from typing import List
from langchain.schema import Document

class BaseLoader(ABC):
    @abstractmethod
    def load(self, file_path: str) -> List[Document]:
        pass

class UniversalDocumentLoader:
    """파일 확장자에 따라 적절한 로더 선택"""

    SUPPORTED_EXTENSIONS = {
        '.pdf': PDFLoader,
        '.docx': DocxLoader,
        '.doc': DocxLoader,
        '.txt': TextLoader,
        '.md': TextLoader,
        '.html': HTMLLoader,
    }

    def load(self, file_path: str) -> List[Document]:
        ext = Path(file_path).suffix.lower()
        if ext not in self.SUPPORTED_EXTENSIONS:
            raise UnsupportedFileTypeError(f"Unsupported: {ext}")

        loader_class = self.SUPPORTED_EXTENSIONS[ext]
        return loader_class().load(file_path)
```

### 4.2 Text Splitter (`text_splitter.py`)

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

class KoreanTextSplitter:
    """한국어에 최적화된 텍스트 분할기"""

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""],
            length_function=len,
        )

    def split(self, documents: List[Document]) -> List[Document]:
        return self.splitter.split_documents(documents)
```

### 4.3 Vector Store (`vector_store.py`)

```python
from chromadb import PersistentClient
from langchain_openai import OpenAIEmbeddings

class VectorStoreManager:
    def __init__(self, persist_directory: str):
        self.client = PersistentClient(path=persist_directory)
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small"
        )

    def add_documents(
        self,
        documents: List[Document],
        user_id: int,
        document_id: int
    ) -> None:
        """문서 청크를 벡터 DB에 저장"""
        collection = self.client.get_or_create_collection(
            name=f"user_{user_id}"
        )

        texts = [doc.page_content for doc in documents]
        embeddings = self.embeddings.embed_documents(texts)

        collection.add(
            ids=[f"{document_id}_{i}" for i in range(len(documents))],
            embeddings=embeddings,
            documents=texts,
            metadatas=[doc.metadata for doc in documents]
        )

    def search(
        self,
        query: str,
        user_id: int,
        top_k: int = 5
    ) -> List[Document]:
        """유사 문서 검색"""
        collection = self.client.get_collection(name=f"user_{user_id}")
        query_embedding = self.embeddings.embed_query(query)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )

        return self._results_to_documents(results)
```

### 4.4 RAG Chain (`rag_chain.py`)

```python
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

class RAGChain:
    SYSTEM_PROMPT = """당신은 문서 기반 질의응답 AI 어시스턴트입니다.

    규칙:
    1. 제공된 문서 내용만을 기반으로 답변하세요.
    2. 문서에 없는 내용은 "문서에서 해당 정보를 찾을 수 없습니다"라고 답하세요.
    3. 답변 시 출처 문서를 명시하세요.
    4. 한국어로 친절하게 답변하세요.

    참고 문서:
    {context}

    이전 대화:
    {chat_history}
    """

    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.7,
            streaming=True
        )
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", self.SYSTEM_PROMPT),
            ("human", "{question}")
        ])

    async def astream(
        self,
        question: str,
        context: str,
        chat_history: str = ""
    ):
        """스트리밍 응답 생성"""
        chain = self.prompt | self.llm

        async for chunk in chain.astream({
            "question": question,
            "context": context,
            "chat_history": chat_history
        }):
            yield chunk.content
```

### 4.5 OCR Service (`ocr.py`)

```python
import easyocr
from PIL import Image

class OCRService:
    def __init__(self):
        self.reader = easyocr.Reader(['ko', 'en'], gpu=False)

    def extract_text(self, image_path: str) -> str:
        """이미지에서 텍스트 추출"""
        results = self.reader.readtext(image_path)
        texts = [result[1] for result in results]
        return "\n".join(texts)

    def process_scanned_pdf(self, pdf_path: str) -> str:
        """스캔된 PDF를 이미지로 변환 후 OCR"""
        from pdf2image import convert_from_path

        images = convert_from_path(pdf_path)
        all_text = []

        for i, image in enumerate(images):
            temp_path = f"/tmp/page_{i}.png"
            image.save(temp_path)
            text = self.extract_text(temp_path)
            all_text.append(f"[Page {i+1}]\n{text}")

        return "\n\n".join(all_text)
```

### 4.6 Speech Service (`speech.py`)

```python
from openai import OpenAI

class SpeechService:
    def __init__(self):
        self.client = OpenAI()

    def transcribe(self, audio_path: str) -> str:
        """음성 파일을 텍스트로 변환"""
        with open(audio_path, "rb") as audio_file:
            transcript = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="ko"
            )
        return transcript.text
```

---

## 5. API 설계

### 5.1 인증 흐름

```
[회원가입]
POST /auth/register
    → 이메일 중복 체크
    → 비밀번호 해싱
    → 사용자 저장
    → 성공 응답

[로그인]
POST /auth/login
    → 이메일/비밀번호 검증
    → JWT 토큰 생성 (access_token + refresh_token)
    → 토큰 응답

[인증된 요청]
Authorization: Bearer <access_token>
    → JWT 검증
    → 사용자 정보 추출
    → 요청 처리
```

### 5.2 스트리밍 응답

```python
from fastapi import FastAPI
from sse_starlette.sse import EventSourceResponse

@router.post("/query/stream")
async def query_stream(request: QueryRequest):
    async def event_generator():
        async for chunk in rag_chain.astream(
            question=request.question,
            context=context,
            chat_history=history
        ):
            yield {
                "event": "message",
                "data": json.dumps({"content": chunk})
            }

        yield {
            "event": "done",
            "data": json.dumps({"sources": sources})
        }

    return EventSourceResponse(event_generator())
```

---

## 6. 보안 설계

### 6.1 인증/인가

| 항목 | 구현 |
|------|------|
| 비밀번호 저장 | bcrypt 해싱 (cost factor: 12) |
| 토큰 | JWT (RS256 또는 HS256) |
| 토큰 만료 | Access: 30분, Refresh: 7일 |
| 권한 관리 | Role-based (user, admin) |

### 6.2 API 보안

| 항목 | 구현 |
|------|------|
| CORS | 허용 도메인 화이트리스트 |
| Rate Limiting | 100 requests/minute/user |
| Input Validation | Pydantic 스키마 검증 |
| File Upload | 확장자/크기/MIME 타입 검증 |

### 6.3 데이터 보안

| 항목 | 구현 |
|------|------|
| 파일 저장 | 사용자별 디렉토리 분리 |
| 벡터 DB | 사용자별 컬렉션 분리 |
| SQL Injection | SQLAlchemy ORM 사용 |

---

## 7. 성능 최적화

### 7.1 캐싱 전략

```python
from functools import lru_cache

# 임베딩 캐싱 (자주 검색되는 쿼리)
@lru_cache(maxsize=1000)
def get_cached_embedding(query: str) -> List[float]:
    return embeddings.embed_query(query)

# 문서 메타데이터 캐싱
from cachetools import TTLCache
metadata_cache = TTLCache(maxsize=500, ttl=3600)
```

### 7.2 비동기 처리

```python
# 문서 처리 백그라운드 작업
from fastapi import BackgroundTasks

@router.post("/documents/upload")
async def upload_document(
    file: UploadFile,
    background_tasks: BackgroundTasks
):
    # 파일 저장 (즉시)
    file_path = await save_file(file)
    document = await create_document_record(file_path)

    # 임베딩 처리 (백그라운드)
    background_tasks.add_task(
        process_document_embeddings,
        document.id,
        file_path
    )

    return {"document_id": document.id, "status": "processing"}
```

### 7.3 청킹 최적화

| 파라미터 | 값 | 근거 |
|---------|-----|------|
| chunk_size | 1000 | 한국어 평균 문단 길이 고려 |
| chunk_overlap | 200 | 문맥 유지 (20%) |
| top_k | 5 | 정확도/비용 균형 |

---

## 8. 모니터링

### 8.1 로깅

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

# 요청 로깅
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    logger.info(
        f"{request.method} {request.url.path} "
        f"- {response.status_code} - {duration:.3f}s"
    )
    return response
```

### 8.2 헬스체크

```python
@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "services": {
            "database": await check_database(),
            "vector_store": await check_vector_store(),
            "openai": await check_openai_api()
        }
    }
```

---

## 9. 배포 구성

### 9.1 Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=sqlite:///./data/app.db
      - CHROMA_PERSIST_DIRECTORY=/data/chroma_db
    volumes:
      - ./data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

volumes:
  data:
```

### 9.2 환경 변수

```bash
# .env.example
# OpenAI
OPENAI_API_KEY=sk-xxx

# JWT
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=sqlite:///./data/app.db

# ChromaDB
CHROMA_PERSIST_DIRECTORY=./data/chroma_db

# File Upload
MAX_FILE_SIZE_MB=50
UPLOAD_DIRECTORY=./data/documents

# CORS
CORS_ORIGINS=["http://localhost:3000"]
```

---

## 10. 테스트 전략

### 10.1 테스트 유형

| 유형 | 도구 | 범위 |
|------|------|------|
| Unit Test | pytest | 개별 함수/클래스 |
| Integration Test | pytest | API 엔드포인트 |
| E2E Test | Playwright | 사용자 시나리오 |
| Load Test | locust | 성능/부하 |

### 10.2 테스트 예시

```python
# tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_query_requires_auth():
    response = client.post("/query", json={"question": "test"})
    assert response.status_code == 401

@pytest.fixture
def auth_headers():
    # 테스트용 토큰 생성
    response = client.post("/auth/login", json={
        "email": "test@example.com",
        "password": "testpass"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_query_with_auth(auth_headers):
    response = client.post(
        "/query",
        json={"question": "테스트 질문"},
        headers=auth_headers
    )
    assert response.status_code == 200
```
