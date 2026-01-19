from typing import AsyncGenerator, List, Dict, Optional, Tuple
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.documents import Document
from app.core.config import settings
import os

# Few-Shot 예시
FEW_SHOT_EXAMPLES = """
## 좋은 답변 예시

### 예시 1:
질문: "이 문서에서 말하는 핵심 기능은 무엇인가요?"
사고 과정:
1. 먼저 문서에서 "핵심 기능", "주요 기능", "feature" 등의 키워드를 찾습니다.
2. 해당 섹션의 내용을 요약합니다.
3. 중요도에 따라 정리하여 답변합니다.
답변: "문서에 따르면 핵심 기능은 다음과 같습니다: 첫째, ... 둘째, ... 셋째, ..."

### 예시 2:
질문: "이전 질문과 관련해서 더 자세히 설명해주세요"
사고 과정:
1. 이전 대화 내용을 확인합니다.
2. 이전에 논의된 주제와 관련된 추가 정보를 문서에서 찾습니다.
3. 맥락을 유지하며 상세한 정보를 제공합니다.
답변: "앞서 말씀드린 [이전 주제]에 대해 더 자세히 설명드리면..."
"""

# Chain of Thought 프롬프트 (출처 포함)
COT_SYSTEM_PROMPT = """당신은 제공된 문서를 기반으로 질문에 답변하는 고급 AI 어시스턴트입니다.

## 사고 방식 (Chain of Thought)
답변하기 전에 다음 단계를 따르세요:
1. **질문 분석**: 사용자가 정확히 무엇을 묻고 있는지 파악
2. **맥락 확인**: 이전 대화 내용이 있다면 참고하여 맥락 유지
3. **문서 검색**: 제공된 Context에서 관련 정보 찾기
4. **정보 종합**: 찾은 정보를 논리적으로 정리
5. **답변 생성**: 명확하고 구조화된 답변 제공

## 데이터 분석 및 통계 관련 질문 시 특별 지침
사용자가 데이터 전처리, 결측치, 코딩 방식 등에 대해 질문할 경우:
1. **파일 간 교차 검증**: 제공된 '설문지(Questionnaire)', '연구계획서', '코딩 데이터(Excel/CSV)' 파일들을 서로 대조하세요.
2. **결측치 원인 파악**: 
   - 단순한 "응답 없음"인지, "조건부 문항에 따른 자연스러운 결측(Valid Skip)"인지 설문 로직을 통해 확인하세요.
   - 예: "흡연 경험 없음" -> "하루 흡연량" 문항은 결측이 정상입니다.
3. **구체적 해결책 제시**:
   - 일반적인 교과서적 답변(삭제/평균대체 등)을 지양하세요.
   - 해당 데이터의 맥락에 맞는 구체적 처리를 제안하세요. (예: "해당 변수는 조건부 문항이므로 결측치를 0 또는 -1로 코딩하여 분석에 포함하세요.")

## 답변 규칙
- 문서 내용을 기반으로 정확하게 답변
- 이전 대화의 맥락을 반드시 고려
- 문서에 없는 내용은 솔직히 "문서에서 해당 정보를 찾을 수 없습니다"라고 답변
- 답변 시 어느 문서에서 정보를 가져왔는지 명시 (예: "[문서 1]에 따르면...")
- 복잡한 답변은 번호나 불릿 포인트로 구조화

{few_shot_examples}
"""


class RAGChain:
    def __init__(self, retriever):
        self.retriever = retriever
        self.llm = ChatOpenAI(
            openai_api_key=settings.OPENAI_API_KEY,
            model="gpt-4o",
            temperature=0.1,
            streaming=True
        )
        
        # 대화 히스토리를 포함한 프롬프트
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", COT_SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", """
# 문서 Context (출처 포함):
{context}

# 사용자 질문:
{question}

# 답변 시 반드시 어느 문서에서 정보를 가져왔는지 언급해주세요:""")
        ])
        
        # 기존 호환성을 위한 단순 프롬프트
        self.simple_prompt = ChatPromptTemplate.from_template(
            """당신은 제공된 문서를 기반으로 질문에 답변하는 AI 어시스턴트입니다.
            문서의 내용을 기반으로 상세하고 정확하게 답변해주세요.
            답변 시 어느 문서에서 정보를 가져왔는지 언급해주세요.
            문서에 없는 내용은 "문서에서 해당 정보를 찾을 수 없습니다"라고 답변해주세요.
            
            # Context (출처 포함):
            {context}
            
            # Question:
            {question}
            
            # Answer:"""
        )

    def _format_docs_with_sources(self, docs: List[Document]) -> Tuple[str, List[Dict]]:
        """문서를 포맷하고 출처 정보 반환"""
        if not docs:
            return "관련 문서를 찾을 수 없습니다.", []
        
        sources = []
        formatted_parts = []
        
        for i, doc in enumerate(docs):
            # 메타데이터에서 파일 정보 추출
            metadata = doc.metadata or {}
            full_path = metadata.get("source", metadata.get("file_path", "Unknown"))
            
            # 파일명만 추출
            source_file = full_path
            if full_path and full_path != "Unknown":
                source_file = os.path.basename(full_path)
            
            page = metadata.get("page", None)
            chunk_id = metadata.get("chunk_id", i + 1)
            
            # 출처 정보 저장 (파일 경로 포함)
            source_info = {
                "document": source_file,
                "file_path": full_path,  # 전체 경로 추가
                "page": page,
                "chunk": chunk_id,
                "excerpt": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
            }
            sources.append(source_info)
            
            # 포맷된 컨텍스트
            source_label = f"📄 **[문서 {i+1}]** {source_file}"
            if page:
                source_label += f" (페이지 {page})"
            
            formatted_parts.append(f"{source_label}\n{doc.page_content}")
        
        return "\n\n---\n\n".join(formatted_parts), sources

    def _format_docs(self, docs):
        """단순 포맷 (호환성용)"""
        context, _ = self._format_docs_with_sources(docs)
        return context
    
    def _format_chat_history(self, history: List[Dict]) -> List:
        """대화 히스토리를 LangChain 메시지 형식으로 변환"""
        messages = []
        for msg in history:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg.get("content", "")))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg.get("content", "")))
        return messages

    def get_chain(self):
        """기존 호환성을 위한 단순 체인"""
        rag_chain = (
            {"context": self.retriever | self._format_docs, "question": RunnablePassthrough()}
            | self.simple_prompt
            | self.llm
            | StrOutputParser()
        )
        return rag_chain

    async def astream_answer(self, question: str) -> AsyncGenerator[str, None]:
        """기존 호환성을 위한 스트리밍"""
        chain = (
            {"context": self.retriever | self._format_docs, "question": RunnablePassthrough()}
            | self.simple_prompt
            | self.llm
            | StrOutputParser()
        )
        
        async for chunk in chain.astream(question):
            yield chunk

    async def astream_answer_with_history(
        self, 
        question: str, 
        chat_history: Optional[List[Dict]] = None
    ) -> AsyncGenerator[str, None]:
        """대화 히스토리와 CoT를 포함한 고급 스트리밍"""
        history = chat_history or []
        formatted_history = self._format_chat_history(history)
        
        # 컨텍스트 검색 (최근 대화 내용도 쿼리에 포함)
        enhanced_query = question
        if history:
            recent_context = " ".join([
                msg.get("content", "")[:100] 
                for msg in history[-3:]
            ])
            enhanced_query = f"{recent_context} {question}"
        
        # 문서 검색
        docs = self.retriever.invoke(enhanced_query)
        context, sources = self._format_docs_with_sources(docs)
        
        # 체인 실행
        chain = self.prompt | self.llm | StrOutputParser()
        
        async for chunk in chain.astream({
            "context": context,
            "question": question,
            "chat_history": formatted_history,
            "few_shot_examples": FEW_SHOT_EXAMPLES
        }):
            yield chunk
        
        # 마지막에 출처 정보 추가 (파일 경로 포함)
        if sources:
            yield "\n\n---\n📚 **출처:**\n"
            for i, src in enumerate(sources):
                source_text = f"- **{src['document']}**"
                if src.get('page'):
                    source_text += f" (p.{src['page']})"
                source_text += f"\n  📁 경로: `{src.get('file_path', 'N/A')}`"
                source_text += f"\n  📝 발췌: \"{src['excerpt'][:100]}...\"\n"
                yield source_text

    async def get_sources(self, question: str) -> List[Dict]:
        """질문에 대한 소스 문서 정보만 반환"""
        docs = self.retriever.invoke(question)
        _, sources = self._format_docs_with_sources(docs)
        return sources
