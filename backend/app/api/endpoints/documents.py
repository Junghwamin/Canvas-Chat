import shutil
import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import models
from app.db.database import get_db
from app.core.rag.document_loader import UniversalDocumentLoader
from app.core.rag.vector_store import VectorStoreManager


class TextDocumentRequest(BaseModel):
    content: str
    filename: str
    source_type: Optional[str] = "text"
    metadata: Optional[Dict[str, Any]] = None

router = APIRouter()
vector_store_manager = VectorStoreManager()

UPLOAD_DIR = "./data/documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        # Save file locally
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Create DB record
        db_doc = models.Document(
            user_id=1,  # Temporary hardcoded user for MVP
            filename=file.filename,
            original_filename=file.filename,
            file_path=file_path,
            file_type=file.content_type or "unknown",
            file_size=os.path.getsize(file_path),
            status="processing"
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)

        # Load and Index
        try:
            documents = UniversalDocumentLoader.load(file_path)
            # Add metadata
            for doc in documents:
                doc.metadata["document_id"] = db_doc.id
                doc.metadata["filename"] = file.filename
            
            vector_store_manager.add_documents(documents)
            
            # Update status
            db_doc.status = "completed"
            db_doc.chunk_count = len(documents)
            db.commit()
            
        except Exception as e:
            db_doc.status = "failed"
            db.commit()
            raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

        return {"filename": file.filename, "status": "success", "id": db_doc.id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-text")
async def upload_text_document(
    request: TextDocumentRequest,
    db: Session = Depends(get_db)
):
    """Upload text content as a document (e.g., from Canvas chat export)"""
    try:
        # Ensure filename has .md extension
        filename = request.filename
        if not filename.endswith('.md'):
            filename = filename + '.md'

        # Save content as .md file
        file_path = os.path.join(UPLOAD_DIR, filename)

        # Handle duplicate filenames
        base_name = filename[:-3]  # Remove .md
        counter = 1
        while os.path.exists(file_path):
            filename = f"{base_name}_{counter}.md"
            file_path = os.path.join(UPLOAD_DIR, filename)
            counter += 1

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(request.content)

        # Create DB record
        db_doc = models.Document(
            user_id=1,  # Temporary hardcoded user for MVP
            filename=filename,
            original_filename=request.filename,
            file_path=file_path,
            file_type="text/markdown",
            file_size=len(request.content.encode('utf-8')),
            status="processing"
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)

        # Load and Index
        try:
            documents = UniversalDocumentLoader.load(file_path)
            # Add metadata
            for doc in documents:
                doc.metadata["document_id"] = db_doc.id
                doc.metadata["filename"] = filename
                doc.metadata["source_type"] = request.source_type
                if request.metadata:
                    doc.metadata.update(request.metadata)

            vector_store_manager.add_documents(documents)

            # Update status
            db_doc.status = "completed"
            db_doc.chunk_count = len(documents)
            db.commit()

        except Exception as e:
            db_doc.status = "failed"
            db.commit()
            raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

        return {
            "filename": filename,
            "status": "success",
            "id": db_doc.id,
            "source_type": request.source_type,
            "chunk_count": db_doc.chunk_count
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(models.Document).all()
    return docs

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Delete a document by ID (file, database record, and vectors)"""
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # 1. Delete vectors from ChromaDB
    deleted_vectors = 0
    try:
        deleted_vectors = vector_store_manager.delete_by_document_id(document_id)
        # Also try by filename as fallback
        if deleted_vectors == 0 and doc.filename:
            deleted_vectors = vector_store_manager.delete_by_filename(doc.filename)
    except Exception as e:
        print(f"Warning: Could not delete vectors: {e}")
    
    # 2. Delete file from disk
    try:
        if doc.file_path and os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except Exception as e:
        print(f"Warning: Could not delete file {doc.file_path}: {e}")
    
    # 3. Delete from database
    db.delete(doc)
    db.commit()
    
    return {
        "message": "Document deleted",
        "id": document_id,
        "vectors_deleted": deleted_vectors
    }
