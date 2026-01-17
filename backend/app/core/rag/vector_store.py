from typing import List, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from app.core.config import settings

class VectorStoreManager:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=settings.OPENAI_API_KEY,
            model="text-embedding-3-small"
        )
        self.persist_directory = settings.CHROMA_PERSIST_DIRECTORY
        
        # Initialize Chroma Client
        self._client = chromadb.PersistentClient(path=self.persist_directory)
        self._collection = self._client.get_or_create_collection(name="rag_documents")
        
        # Initialize LangChain Chroma wrapper
        self.vector_store = Chroma(
            collection_name="rag_documents",
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory
        )

    def add_documents(self, documents: List[Document]):
        """Add documents to the vector store."""
        if not documents:
            return
        
        # Use simpler add_documents from LangChain wrapper
        self.vector_store.add_documents(documents)

    def search(self, query: str, k: int = 4) -> List[Document]:
        """Search for similar documents."""
        return self.vector_store.similarity_search(query, k=k)

    def get_retriever(self, search_kwargs: dict = None):
        if search_kwargs is None:
            search_kwargs = {"k": 4}
        return self.vector_store.as_retriever(search_kwargs=search_kwargs)

    def delete_by_document_id(self, document_id: int) -> int:
        """Delete all vectors associated with a document ID.
        
        Returns the number of deleted vectors.
        """
        try:
            # Get all documents with matching document_id in metadata
            results = self._collection.get(
                where={"document_id": document_id}
            )
            
            if results and results.get("ids"):
                ids_to_delete = results["ids"]
                self._collection.delete(ids=ids_to_delete)
                return len(ids_to_delete)
            
            return 0
        except Exception as e:
            print(f"Error deleting vectors for document {document_id}: {e}")
            return 0

    def delete_by_filename(self, filename: str) -> int:
        """Delete all vectors associated with a filename.
        
        Returns the number of deleted vectors.
        """
        try:
            # Get all documents with matching filename in metadata
            results = self._collection.get(
                where={"filename": filename}
            )
            
            if results and results.get("ids"):
                ids_to_delete = results["ids"]
                self._collection.delete(ids=ids_to_delete)
                return len(ids_to_delete)
            
            return 0
        except Exception as e:
            print(f"Error deleting vectors for filename {filename}: {e}")
            return 0
