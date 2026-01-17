# API Specification
# RAG Document Q&A Service

---

## 기본 정보

| 항목 | 값 |
|------|-----|
| Base URL | `http://localhost:8000/api/v1` |
| 인증 방식 | Bearer Token (JWT) |
| Content-Type | `application/json` |
| 문자 인코딩 | UTF-8 |

---

## 인증 (Authentication)

### 회원가입
사용자 계정을 생성합니다.

```http
POST /auth/register
```

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "username": "홍길동"
}
```

**Response (201 Created)**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "홍길동",
  "created_at": "2024-01-17T10:00:00Z"
}
```

**Errors**
| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_EMAIL | 이메일 형식이 올바르지 않음 |
| 400 | WEAK_PASSWORD | 비밀번호가 조건을 충족하지 않음 |
| 409 | EMAIL_EXISTS | 이미 등록된 이메일 |

---

### 로그인
JWT 토큰을 발급받습니다.

```http
POST /auth/login
```

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**Response (200 OK)**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Errors**
| Status | Code | Description |
|--------|------|-------------|
| 401 | INVALID_CREDENTIALS | 이메일 또는 비밀번호가 일치하지 않음 |
| 403 | ACCOUNT_DISABLED | 비활성화된 계정 |

---

### 토큰 갱신
Refresh 토큰으로 새 Access 토큰을 발급받습니다.

```http
POST /auth/refresh
```

**Request Body**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK)**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

---

### 내 정보 조회
현재 로그인한 사용자 정보를 조회합니다.

```http
GET /auth/me
Authorization: Bearer {access_token}
```

**Response (200 OK)**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "홍길동",
  "is_admin": false,
  "created_at": "2024-01-17T10:00:00Z"
}
```

---

## 문서 (Documents)

### 문서 업로드
파일을 업로드하고 벡터 임베딩합니다.

```http
POST /documents/upload
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | 업로드할 파일 (PDF, DOCX, TXT, MD) |
| collection_id | Integer | No | 소속 컬렉션 ID |

**Response (202 Accepted)**
```json
{
  "id": 1,
  "filename": "abc123_document.pdf",
  "original_filename": "document.pdf",
  "file_type": "pdf",
  "file_size": 1048576,
  "status": "processing",
  "created_at": "2024-01-17T10:00:00Z"
}
```

**Errors**
| Status | Code | Description |
|--------|------|-------------|
| 400 | UNSUPPORTED_FILE_TYPE | 지원하지 않는 파일 형식 |
| 400 | FILE_TOO_LARGE | 파일 크기 초과 (최대 50MB) |
| 413 | PAYLOAD_TOO_LARGE | 요청 본문 크기 초과 |

---

### URL로 문서 추가
웹페이지 URL을 크롤링하여 문서로 추가합니다.

```http
POST /documents/url
Authorization: Bearer {access_token}
```

**Request Body**
```json
{
  "url": "https://example.com/article",
  "collection_id": 1
}
```

**Response (202 Accepted)**
```json
{
  "id": 2,
  "filename": "example_com_article.html",
  "original_filename": "https://example.com/article",
  "file_type": "html",
  "status": "processing",
  "created_at": "2024-01-17T10:00:00Z"
}
```

---

### 이미지 문서 업로드 (OCR)
이미지 파일을 OCR 처리하여 문서로 추가합니다.

```http
POST /documents/image
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | 이미지 파일 (PNG, JPG, JPEG) |
| collection_id | Integer | No | 소속 컬렉션 ID |

**Response (202 Accepted)**
```json
{
  "id": 3,
  "filename": "abc123_scan.png",
  "original_filename": "scan.png",
  "file_type": "image",
  "status": "processing",
  "created_at": "2024-01-17T10:00:00Z"
}
```

---

### 대량 업로드
여러 파일을 한 번에 업로드합니다.

```http
POST /documents/batch
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| files | File[] | Yes | 업로드할 파일 목록 (최대 10개) |
| collection_id | Integer | No | 소속 컬렉션 ID |

**Response (202 Accepted)**
```json
{
  "documents": [
    {"id": 4, "filename": "file1.pdf", "status": "processing"},
    {"id": 5, "filename": "file2.docx", "status": "processing"},
    {"id": 6, "filename": "file3.txt", "status": "processing"}
  ],
  "total": 3
}
```

---

### 문서 목록 조회
사용자의 문서 목록을 조회합니다.

```http
GET /documents
Authorization: Bearer {access_token}
```

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | Integer | 1 | 페이지 번호 |
| limit | Integer | 20 | 페이지당 항목 수 (최대 100) |
| collection_id | Integer | - | 특정 컬렉션의 문서만 조회 |
| status | String | - | 상태 필터 (processing, ready, error) |

**Response (200 OK)**
```json
{
  "documents": [
    {
      "id": 1,
      "filename": "document.pdf",
      "original_filename": "document.pdf",
      "file_type": "pdf",
      "file_size": 1048576,
      "chunk_count": 15,
      "status": "ready",
      "collection": {
        "id": 1,
        "name": "프로젝트 A"
      },
      "created_at": "2024-01-17T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "pages": 1
}
```

---

### 문서 상세 조회
특정 문서의 상세 정보를 조회합니다.

```http
GET /documents/{document_id}
Authorization: Bearer {access_token}
```

**Response (200 OK)**
```json
{
  "id": 1,
  "filename": "document.pdf",
  "original_filename": "document.pdf",
  "file_type": "pdf",
  "file_size": 1048576,
  "chunk_count": 15,
  "status": "ready",
  "collection": {
    "id": 1,
    "name": "프로젝트 A"
  },
  "versions": [
    {"version": 1, "created_at": "2024-01-17T10:00:00Z"},
    {"version": 2, "created_at": "2024-01-18T10:00:00Z"}
  ],
  "created_at": "2024-01-17T10:00:00Z",
  "updated_at": "2024-01-18T10:00:00Z"
}
```

---

### 문서 삭제
문서를 삭제합니다 (벡터 데이터 포함).

```http
DELETE /documents/{document_id}
Authorization: Bearer {access_token}
```

**Response (204 No Content)**

---

### 문서 버전 목록
문서의 버전 히스토리를 조회합니다.

```http
GET /documents/{document_id}/versions
Authorization: Bearer {access_token}
```

**Response (200 OK)**
```json
{
  "versions": [
    {
      "version": 2,
      "file_size": 1100000,
      "created_at": "2024-01-18T10:00:00Z"
    },
    {
      "version": 1,
      "file_size": 1048576,
      "created_at": "2024-01-17T10:00:00Z"
    }
  ]
}
```

---

### 버전 롤백
특정 버전으로 문서를 롤백합니다.

```http
POST /documents/{document_id}/rollback
Authorization: Bearer {access_token}
```

**Request Body**
```json
{
  "version": 1
}
```

**Response (200 OK)**
```json
{
  "id": 1,
  "current_version": 1,
  "status": "processing",
  "message": "롤백이 시작되었습니다"
}
```

---

## 질의응답 (Query)

### 질의응답 (일반)
문서 기반으로 질문에 답변합니다.

```http
POST /query
Authorization: Bearer {access_token}
```

**Request Body**
```json
{
  "question": "프로젝트의 주요 목표는 무엇인가요?",
  "conversation_id": 1,
  "collection_id": null,
  "top_k": 5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| question | String | Yes | 질문 내용 |
| conversation_id | Integer | No | 대화 세션 ID (새 대화면 null) |
| collection_id | Integer | No | 특정 컬렉션에서만 검색 |
| top_k | Integer | No | 검색할 문서 청크 수 (기본: 5) |

**Response (200 OK)**
```json
{
  "answer": "프로젝트의 주요 목표는 문서 기반 AI 질의응답 서비스를 구축하는 것입니다. 구체적으로는...",
  "conversation_id": 1,
  "sources": [
    {
      "document_id": 1,
      "document_name": "project_plan.pdf",
      "page": 3,
      "chunk_text": "프로젝트 목표: 문서 기반 AI..."
    },
    {
      "document_id": 2,
      "document_name": "requirements.docx",
      "page": 1,
      "chunk_text": "주요 목표 달성을 위해..."
    }
  ],
  "created_at": "2024-01-17T10:05:00Z"
}
```

---

### 질의응답 (스트리밍)
스트리밍 방식으로 답변을 받습니다 (SSE).

```http
POST /query/stream
Authorization: Bearer {access_token}
```

**Request Body**
```json
{
  "question": "프로젝트의 주요 목표는 무엇인가요?",
  "conversation_id": 1,
  "top_k": 5
}
```

**Response (200 OK, Server-Sent Events)**
```
event: message
data: {"content": "프로젝트의"}

event: message
data: {"content": " 주요"}

event: message
data: {"content": " 목표는"}

...

event: done
data: {"conversation_id": 1, "sources": [...]}
```

**Client 구현 예시 (JavaScript)**
```javascript
const eventSource = new EventSource('/api/v1/query/stream', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ question: '...' })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.content);  // 스트리밍 텍스트
};

eventSource.addEventListener('done', (event) => {
  const data = JSON.parse(event.data);
  console.log(data.sources);  // 출처 정보
  eventSource.close();
});
```

---

### 음성 질의
음성 파일로 질문합니다 (STT → 질의응답).

```http
POST /query/voice
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| audio | File | Yes | 음성 파일 (MP3, WAV, M4A, WEBM) |
| conversation_id | Integer | No | 대화 세션 ID |

**Response (200 OK)**
```json
{
  "transcribed_text": "프로젝트의 주요 목표는 무엇인가요?",
  "answer": "프로젝트의 주요 목표는...",
  "conversation_id": 1,
  "sources": [...]
}
```

---

## 대화 (Conversations)

### 대화 목록 조회
사용자의 대화 목록을 조회합니다.

```http
GET /conversations
Authorization: Bearer {access_token}
```

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | Integer | 1 | 페이지 번호 |
| limit | Integer | 20 | 페이지당 항목 수 |

**Response (200 OK)**
```json
{
  "conversations": [
    {
      "id": 1,
      "title": "프로젝트 목표 관련 질문",
      "message_count": 5,
      "created_at": "2024-01-17T10:00:00Z",
      "updated_at": "2024-01-17T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### 대화 상세 조회
특정 대화의 메시지 목록을 조회합니다.

```http
GET /conversations/{conversation_id}
Authorization: Bearer {access_token}
```

**Response (200 OK)**
```json
{
  "id": 1,
  "title": "프로젝트 목표 관련 질문",
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "프로젝트의 주요 목표는 무엇인가요?",
      "created_at": "2024-01-17T10:00:00Z"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "프로젝트의 주요 목표는...",
      "sources": [...],
      "created_at": "2024-01-17T10:00:05Z"
    }
  ],
  "created_at": "2024-01-17T10:00:00Z"
}
```

---

### 대화 삭제
대화와 관련 메시지를 삭제합니다.

```http
DELETE /conversations/{conversation_id}
Authorization: Bearer {access_token}
```

**Response (204 No Content)**

---

## 컬렉션 (Collections)

### 컬렉션 생성
새 컬렉션을 생성합니다.

```http
POST /collections
Authorization: Bearer {access_token}
```

**Request Body**
```json
{
  "name": "프로젝트 A",
  "description": "프로젝트 A 관련 문서들"
}
```

**Response (201 Created)**
```json
{
  "id": 1,
  "name": "프로젝트 A",
  "description": "프로젝트 A 관련 문서들",
  "document_count": 0,
  "created_at": "2024-01-17T10:00:00Z"
}
```

---

### 컬렉션 목록 조회

```http
GET /collections
Authorization: Bearer {access_token}
```

**Response (200 OK)**
```json
{
  "collections": [
    {
      "id": 1,
      "name": "프로젝트 A",
      "description": "프로젝트 A 관련 문서들",
      "document_count": 5,
      "created_at": "2024-01-17T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

### 컬렉션 삭제
컬렉션을 삭제합니다 (문서는 유지, 소속만 해제).

```http
DELETE /collections/{collection_id}
Authorization: Bearer {access_token}
```

**Response (204 No Content)**

---

## 관리자 (Admin)

### 사용자 목록 조회
모든 사용자 목록을 조회합니다 (관리자 전용).

```http
GET /admin/users
Authorization: Bearer {access_token}
```

**Response (200 OK)**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "username": "홍길동",
      "is_active": true,
      "is_admin": false,
      "document_count": 10,
      "query_count": 50,
      "created_at": "2024-01-17T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

### 사용 통계 조회
시스템 사용 통계를 조회합니다 (관리자 전용).

```http
GET /admin/stats
Authorization: Bearer {access_token}
```

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| period | String | week | 기간 (day, week, month) |

**Response (200 OK)**
```json
{
  "summary": {
    "total_users": 100,
    "total_documents": 500,
    "total_queries": 5000,
    "total_tokens_used": 1000000
  },
  "daily_stats": [
    {
      "date": "2024-01-17",
      "new_users": 5,
      "documents_uploaded": 20,
      "queries": 150,
      "tokens_used": 50000
    }
  ]
}
```

---

### 시스템 상태 조회
시스템 상태를 모니터링합니다.

```http
GET /admin/health
Authorization: Bearer {access_token}
```

**Response (200 OK)**
```json
{
  "status": "healthy",
  "services": {
    "database": {"status": "healthy", "latency_ms": 5},
    "vector_store": {"status": "healthy", "latency_ms": 10},
    "openai_api": {"status": "healthy", "latency_ms": 100}
  },
  "system": {
    "cpu_percent": 25.5,
    "memory_percent": 45.2,
    "disk_percent": 30.0
  }
}
```

---

## 공통 (Common)

### 헬스체크

```http
GET /health
```

**Response (200 OK)**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-17T10:00:00Z"
}
```

---

## 에러 응답

모든 에러는 다음 형식으로 반환됩니다.

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 에러 메시지",
    "details": {}
  }
}
```

### 공통 에러 코드

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | 잘못된 요청 |
| 401 | UNAUTHORIZED | 인증 필요 |
| 403 | FORBIDDEN | 권한 없음 |
| 404 | NOT_FOUND | 리소스를 찾을 수 없음 |
| 409 | CONFLICT | 리소스 충돌 |
| 422 | VALIDATION_ERROR | 유효성 검사 실패 |
| 429 | TOO_MANY_REQUESTS | 요청 횟수 초과 |
| 500 | INTERNAL_ERROR | 서버 내부 오류 |
| 503 | SERVICE_UNAVAILABLE | 서비스 일시 중단 |

---

## Rate Limiting

| 사용자 유형 | 제한 |
|------------|------|
| 일반 사용자 | 100 requests/minute |
| 관리자 | 500 requests/minute |

Rate limit 초과 시:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705485600
```

---

## SDK 예시

### Python

```python
import requests

class RAGClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {api_key}"}

    def query(self, question: str) -> dict:
        response = requests.post(
            f"{self.base_url}/query",
            headers=self.headers,
            json={"question": question}
        )
        return response.json()

    def upload_document(self, file_path: str) -> dict:
        with open(file_path, "rb") as f:
            response = requests.post(
                f"{self.base_url}/documents/upload",
                headers=self.headers,
                files={"file": f}
            )
        return response.json()

# 사용 예시
client = RAGClient("http://localhost:8000/api/v1", "your-token")
answer = client.query("프로젝트 목표가 뭐야?")
print(answer["answer"])
```

### JavaScript/TypeScript

```typescript
class RAGClient {
  constructor(
    private baseUrl: string,
    private token: string
  ) {}

  private get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async query(question: string): Promise<QueryResponse> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ question })
    });
    return response.json();
  }

  async *queryStream(question: string): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/query/stream`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ question })
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value);
    }
  }
}

// 사용 예시
const client = new RAGClient('http://localhost:8000/api/v1', 'your-token');

// 일반 질의
const { answer } = await client.query('프로젝트 목표가 뭐야?');
console.log(answer);

// 스트리밍 질의
for await (const chunk of client.queryStream('프로젝트 목표가 뭐야?')) {
  process.stdout.write(chunk);
}
```

---

## 현재 구현된 API (2026-01-17 업데이트)

> 다음은 현재 실제로 구현되어 작동하는 API 엔드포인트입니다.

### 기본 정보 (현재 버전)

| 항목 | 값 |
|------|-----|
| Base URL | `http://localhost:8000/api/v1` |
| 인증 방식 | 없음 (MVP 버전) |
| Content-Type | `application/json` |

---

### 헬스체크

```http
GET /health
```

**Response (200 OK)**
```json
{
  "status": "healthy"
}
```

---

### 문서 업로드

```http
POST /api/v1/documents/upload
Content-Type: multipart/form-data
```

**지원 파일 형식**: PDF, DOCX, TXT, MD, XLSX, XLS

**Response (200 OK)**
```json
{
  "filename": "document.pdf",
  "status": "success",
  "id": 1
}
```

---

### 문서 목록 조회

```http
GET /api/v1/documents/
```

**Response (200 OK)**
```json
[
  {
    "id": 1,
    "filename": "document.pdf",
    "status": "completed",
    "chunk_count": 15,
    "created_at": "2026-01-17T10:00:00"
  }
]
```

---

### 문서 삭제

```http
DELETE /api/v1/documents/{document_id}
```

**Response (200 OK)**
```json
{
  "message": "Document deleted",
  "id": 1
}
```

---

### RAG 질의응답 (대화 히스토리 포함)

```http
POST /api/v1/chat/query
Content-Type: application/json
```

**Request Body**
```json
{
  "question": "이 문서의 핵심 내용은?",
  "chat_history": [
    {"role": "user", "content": "안녕하세요"},
    {"role": "assistant", "content": "안녕하세요! 무엇을 도와드릴까요?"}
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| question | String | Yes | 질문 내용 |
| chat_history | Array | No | 이전 대화 내용 (최대 10개 권장) |

**Response (200 OK, Streaming Text)**
```
문서에 따르면 핵심 내용은...

---
📚 **출처:**
- **document.pdf** (p.1): "발췌 내용..."
```

**기능 특징:**
- **Chain of Thought**: 5단계 추론 과정 (질문 분석 → 맥락 확인 → 문서 검색 → 정보 종합 → 답변 생성)
- **Few Shot Learning**: 좋은 답변 예시 패턴 적용
- **대화 히스토리**: 이전 대화 맥락 유지
- **출처 표시**: 답변 끝에 문서명, 페이지, 발췌문 표시

