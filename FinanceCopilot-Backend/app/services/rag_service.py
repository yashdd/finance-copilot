from typing import List, Optional, Dict
from bson import ObjectId
from ..database.models import Document
from ..database import get_database
from ..config import settings
import json
import os

try:
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    from langchain_community.vectorstores import Chroma
    from langchain_core.documents import Document as LangChainDocument
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    print("Warning: LangChain vector store dependencies not installed. RAG features will be limited.")


class RAGService:
    """Service for RAG (Retrieval-Augmented Generation) with ChromaDB vector storage"""
    
    def __init__(self, db=None):
        self.db = db if db is not None else get_database()
        self.documents_collection = self.db["documents"]
        self.embeddings = None
        self.vector_store = None
        self.chroma_client = None
        
        if EMBEDDINGS_AVAILABLE and settings.gemini_api_key:
            try:
                # Initialize embeddings model
                self.embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/embedding-001",
                    google_api_key=settings.gemini_api_key
                )
                
                # Initialize ChromaDB
                # ChromaDB will store vectors in a local directory
                persist_directory = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
                
                try:
                    # Create ChromaDB client
                    self.chroma_client = chromadb.PersistentClient(
                        path=persist_directory,
                        settings=ChromaSettings(anonymized_telemetry=False)
                    )
                    
                    # Get or create collection
                    collection_name = "finance_documents"
                    try:
                        self.chroma_collection = self.chroma_client.get_collection(collection_name)
                    except:
                        self.chroma_collection = self.chroma_client.create_collection(
                            name=collection_name,
                            metadata={"hnsw:space": "cosine"}
                        )
                    
                    # Initialize LangChain Chroma vector store
                    self.vector_store = Chroma(
                        client=self.chroma_client,
                        collection_name=collection_name,
                        embedding_function=self.embeddings,
                        persist_directory=persist_directory
                    )
                    
                    print(f"ChromaDB initialized at {persist_directory}")
                except Exception as e:
                    print(f"Warning: Could not initialize ChromaDB: {e}")
                    self.vector_store = None
                    self.chroma_client = None
                    
            except Exception as e:
                print(f"Warning: Could not initialize embeddings: {e}")
                self.embeddings = None
    
    def add_document(
        self,
        user_id: Optional[str],
        title: str,
        content: str,
        source: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Document:
        """Add a document to the RAG system"""
        # Create document record in MongoDB
        doc_doc = {
            "user_id": ObjectId(user_id) if user_id else None,
            "title": title,
            "content": content,
            "source": source or "upload",
            "metadata": metadata or {},
            "created_at": Document().created_at,
            "updated_at": None
        }
        
        result = self.documents_collection.insert_one(doc_doc)
        doc_id = str(result.inserted_id)
        
        # Add to vector store if available
        if self.vector_store and self.embeddings:
            try:
                # Create LangChain document
                doc_metadata = {
                    "id": doc_id,
                    "title": title,
                    "source": source or "upload",
                    "user_id": user_id or "public",
                }
                if metadata:
                    doc_metadata.update(metadata)
                
                langchain_doc = LangChainDocument(
                    page_content=content,
                    metadata=doc_metadata
                )
                
                # Add to vector store with document ID
                self.vector_store.add_documents(
                    [langchain_doc],
                    ids=[doc_id]
                )
            except Exception as e:
                print(f"Warning: Could not add document to vector store: {e}")
        
        # Convert to Document model
        doc_doc["_id"] = result.inserted_id
        return Document(**doc_doc)
    
    def search_documents(
        self,
        query: str,
        user_id: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict]:
        """Search for relevant documents using vector similarity"""
        if not self.vector_store:
            # Fallback to text search in MongoDB
            return self._text_search(query, user_id, limit)
        
        try:
            # Search vector store
            results = self.vector_store.similarity_search_with_score(
                query,
                k=limit * 2  # Get more results to filter by user_id
            )
            
            # Format results and filter by user_id if provided
            documents = []
            for doc, score in results:
                # Filter by user_id if provided
                doc_user_id = doc.metadata.get("user_id")
                if user_id and doc_user_id != user_id and doc_user_id != "public":
                    continue
                
                # Get full document from MongoDB
                try:
                    doc_id = doc.metadata.get("id")
                    if doc_id:
                        mongo_doc = self.documents_collection.find_one({"_id": ObjectId(doc_id)})
                        if mongo_doc:
                            documents.append({
                                "content": mongo_doc.get("content", doc.page_content),
                                "title": mongo_doc.get("title", doc.metadata.get("title", "Untitled")),
                                "source": mongo_doc.get("source", doc.metadata.get("source", "unknown")),
                                "score": float(score),
                                "metadata": mongo_doc.get("metadata", doc.metadata)
                            })
                            if len(documents) >= limit:
                                break
                except Exception as e:
                    print(f"Error fetching document from MongoDB: {e}")
                    # Fallback to vector store data
                    documents.append({
                        "content": doc.page_content,
                        "title": doc.metadata.get("title", "Untitled"),
                        "source": doc.metadata.get("source", "unknown"),
                        "score": float(score),
                        "metadata": doc.metadata
                    })
                    if len(documents) >= limit:
                        break
            
            return documents[:limit]
        except Exception as e:
            print(f"Error searching vector store: {e}")
            return self._text_search(query, user_id, limit)
    
    def _text_search(self, query: str, user_id: Optional[str], limit: int) -> List[Dict]:
        """Fallback text search in MongoDB"""
        try:
            # Simple text search using MongoDB
            search_query = {
                "$or": [
                    {"content": {"$regex": query, "$options": "i"}},
                    {"title": {"$regex": query, "$options": "i"}}
                ]
            }
            
            # Filter by user_id if provided
            if user_id:
                search_query["$or"].append({
                    "$and": [
                        {"$or": [{"user_id": ObjectId(user_id)}, {"user_id": None}]},
                        search_query
                    ]
                })
                # Actually, let's simplify this
                search_query = {
                    "$and": [
                        {"$or": [{"user_id": ObjectId(user_id)}, {"user_id": None}]},
                        {
                            "$or": [
                                {"content": {"$regex": query, "$options": "i"}},
                                {"title": {"$regex": query, "$options": "i"}}
                            ]
                        }
                    ]
                }
            
            mongo_docs = list(self.documents_collection.find(search_query).limit(limit))
            
            return [
                {
                    "content": doc.get("content", ""),
                    "title": doc.get("title", "Untitled"),
                    "source": doc.get("source", "unknown"),
                    "score": 0.5,  # Default score for text search
                    "metadata": doc.get("metadata", {})
                }
                for doc in mongo_docs
            ]
        except Exception as e:
            print(f"Error in text search: {e}")
            return []
    
    def get_user_documents(self, user_id: str, limit: int = 50) -> List[Document]:
        """Get all documents for a user"""
        try:
            doc_docs = list(self.documents_collection.find(
                {"user_id": ObjectId(user_id)}
            ).limit(limit))
            
            return [Document(**doc) for doc in doc_docs]
        except Exception as e:
            print(f"Error getting user documents: {e}")
            return []
    
    def delete_document(self, document_id: str, user_id: str) -> bool:
        """Delete a document"""
        try:
            # Verify document belongs to user
            doc_doc = self.documents_collection.find_one({
                "_id": ObjectId(document_id),
                "user_id": ObjectId(user_id)
            })
            
            if not doc_doc:
                return False
            
            # Remove from vector store if available
            if self.vector_store:
                try:
                    # ChromaDB delete by ID
                    if hasattr(self.vector_store, '_collection'):
                        self.vector_store._collection.delete(ids=[document_id])
                except Exception as e:
                    print(f"Warning: Could not remove from vector store: {e}")
            
            # Delete from MongoDB
            result = self.documents_collection.delete_one({"_id": ObjectId(document_id)})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False
    
    def get_relevant_context(self, query: str, user_id: Optional[str] = None, limit: int = 3) -> str:
        """Get relevant context from RAG for a query"""
        documents = self.search_documents(query, user_id, limit)
        
        if not documents:
            return ""
        
        # Format context
        context_parts = []
        for doc in documents:
            context_parts.append(f"Title: {doc['title']}\nContent: {doc['content'][:500]}...")
        
        return "\n\n".join(context_parts)
