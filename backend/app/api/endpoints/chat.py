from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from fastapi.responses import StreamingResponse
from app.core.rag.vector_store import VectorStoreManager
from app.core.rag.rag_chain import RAGChain

router = APIRouter()

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class QueryRequest(BaseModel):
    question: str
    chat_history: Optional[List[Message]] = None

@router.post("/query")
async def query_document(request: QueryRequest):
    """
    RAG Query with Conversation History, Chain of Thought, and Few Shot Learning
    
    - Maintains conversation context
    - Uses step-by-step reasoning
    - Includes example patterns for better responses
    """
    try:
        vector_manager = VectorStoreManager()
        retriever = vector_manager.get_retriever()
        rag_chain = RAGChain(retriever)
        
        # Convert history to dict format
        history = None
        if request.chat_history:
            history = [{"role": msg.role, "content": msg.content} for msg in request.chat_history]
        
        # Use enhanced streaming with history if history exists
        if history:
            return StreamingResponse(
                rag_chain.astream_answer_with_history(request.question, history),
                media_type="text/event-stream"
            )
        else:
            # Fallback to simple streaming for backwards compatibility
            return StreamingResponse(
                rag_chain.astream_answer(request.question), 
                media_type="text/event-stream"
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query/simple")
async def query_document_simple(request: QueryRequest):
    """Simple query without history for quick testing"""
    try:
        vector_manager = VectorStoreManager()
        retriever = vector_manager.get_retriever()
        rag_chain = RAGChain(retriever)
        
        return StreamingResponse(
            rag_chain.astream_answer(request.question), 
            media_type="text/event-stream"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
