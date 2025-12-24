from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List, Optional
from ..database import get_db
from ..database.models import User, Document
from ..core.security import get_current_active_user
from ..services.rag_service import RAGService
from pydantic import BaseModel

router = APIRouter(prefix="/rag", tags=["RAG"])


class DocumentCreate(BaseModel):
    """Document creation model"""
    title: str
    content: str
    source: Optional[str] = None
    metadata: Optional[dict] = None


class DocumentResponse(BaseModel):
    """Document response model"""
    id: str
    title: str
    content: str
    source: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: str
    
    class Config:
        from_attributes = True


class SearchRequest(BaseModel):
    """Search request model"""
    query: str
    limit: Optional[int] = 5


class SearchResult(BaseModel):
    """Search result model"""
    content: str
    title: str
    source: Optional[str] = None
    score: float
    metadata: Optional[dict] = None


@router.post("/documents", response_model=DocumentResponse)
def create_document(
    document: DocumentCreate,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Add a document to the RAG system"""
    try:
        rag_service = RAGService(db)
        db_doc = rag_service.add_document(
            user_id=str(current_user.id),
            title=document.title,
            content=document.content,
            source=document.source,
            metadata=document.metadata
        )
        
        return DocumentResponse(
            id=str(db_doc.id),
            title=db_doc.title,
            content=db_doc.content,
            source=db_doc.source,
            metadata=db_doc.metadata or {},
            created_at=db_doc.created_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/documents/upload")
def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Upload a document file"""
    try:
        content = file.file.read().decode('utf-8')
        rag_service = RAGService(db)
        db_doc = rag_service.add_document(
            user_id=str(current_user.id),
            title=file.filename or "Uploaded Document",
            content=content,
            source="upload",
            metadata={"filename": file.filename}
        )
        
        return DocumentResponse(
            id=str(db_doc.id),
            title=db_doc.title,
            content=db_doc.content[:500] + "..." if len(db_doc.content) > 500 else db_doc.content,
            source=db_doc.source,
            metadata=db_doc.metadata or {},
            created_at=db_doc.created_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error uploading document: {str(e)}")


@router.post("/search", response_model=List[SearchResult])
def search_documents(
    request: SearchRequest,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Search for relevant documents"""
    try:
        rag_service = RAGService(db)
        results = rag_service.search_documents(
            query=request.query,
            user_id=str(current_user.id),
            limit=request.limit or 5
        )
        
        return [
            SearchResult(
                content=result["content"],
                title=result["title"],
                source=result.get("source"),
                score=result.get("score", 0.0),
                metadata=result.get("metadata", {})
            )
            for result in results
        ]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/documents", response_model=List[DocumentResponse])
def list_documents(
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
    limit: int = 50
):
    """List all documents for the current user"""
    try:
        rag_service = RAGService(db)
        documents = rag_service.get_user_documents(str(current_user.id), limit=limit)
        
        return [
            DocumentResponse(
                id=str(doc.id),
                title=doc.title,
                content=doc.content[:500] + "..." if len(doc.content) > 500 else doc.content,
                source=doc.source,
                metadata=doc.metadata or {},
                created_at=doc.created_at.isoformat()
            )
            for doc in documents
        ]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Delete a document"""
    try:
        rag_service = RAGService(db)
        success = rag_service.delete_document(document_id, str(current_user.id))
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"message": "Document deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

