"""
Document Service

Manages patient document uploads and sharing:
- Upload documents (lab results, insurance, etc.)
- Manage document metadata
- Share documents with doctors
- Track storage usage
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, BinaryIO
from uuid import uuid4
import os

from app.db.schema import Tables, Col
from app.services.supabase import supabase


class DocumentService:
    """Service for managing patient documents"""

    def __init__(self):
        self.supabase = supabase
        self.storage_bucket = "patient-documents"  # Supabase storage bucket

    async def upload_document(
        self,
        patient_id: str,
        file: BinaryIO,
        file_name: str,
        document_type: str,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Upload a document

        Args:
            patient_id: Patient's user ID
            file: File object
            file_name: Original file name
            document_type: Type of document
            notes: Optional notes

        Returns:
            Created document data
        """
        # Generate unique file name
        file_extension = os.path.splitext(file_name)[1]
        unique_file_name = f"{patient_id}/{uuid4()}{file_extension}"

        # Upload to Supabase Storage
        try:
            self.supabase.storage.from_(self.storage_bucket).upload(
                unique_file_name, file
            )

            # Get public URL
            file_url = self.supabase.storage.from_(self.storage_bucket).get_public_url(
                unique_file_name
            )

        except Exception as e:
            raise Exception(f"Failed to upload file: {str(e)}")

        # Get file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        # Determine file type
        file_type = self._get_file_type(file_extension)

        # Create document record
        document = {
            Col.Documents.ID: str(uuid4()),
            Col.Documents.PATIENT_ID: patient_id,
            Col.Documents.UPLOADED_BY: patient_id,
            Col.Documents.TITLE: file_name,
            Col.Documents.FILE_NAME: file_name,
            Col.Documents.FILE_URL: file_url,
            Col.Documents.FILE_TYPE: file_type,
            Col.Documents.FILE_SIZE: file_size,
            Col.Documents.DOCUMENT_TYPE: document_type,
            Col.Documents.CATEGORY: document_type,  # For backward compatibility
            Col.Documents.NOTES: notes,
            Col.Documents.IS_SHARED: False,
            Col.Documents.CREATED_AT: datetime.now().isoformat(),
            Col.Documents.UPDATED_AT: datetime.now().isoformat(),
        }

        response = self.supabase.table(Tables.DOCUMENTS).insert(document).execute()

        if response.data:
            return response.data[0]

        raise Exception("Failed to create document record")

    def _get_file_type(self, extension: str) -> str:
        """Determine file type from extension"""
        extension = extension.lower()

        if extension in [".pdf"]:
            return "application/pdf"
        elif extension in [".jpg", ".jpeg"]:
            return "image/jpeg"
        elif extension in [".png"]:
            return "image/png"
        elif extension in [".doc", ".docx"]:
            return "application/msword"
        else:
            return "application/octet-stream"

    async def get_document(
        self, document_id: str, patient_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get a document by ID

        Args:
            document_id: Document ID
            patient_id: Patient's user ID (for authorization)

        Returns:
            Document data or None
        """
        response = (
            self.supabase.table(Tables.DOCUMENTS)
            .select("*")
            .eq(Col.Documents.ID, document_id)
            .eq(Col.Documents.PATIENT_ID, patient_id)
            .execute()
        )

        return response.data[0] if response.data else None

    async def get_documents(
        self,
        patient_id: str,
        document_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Get documents for a patient

        Args:
            patient_id: Patient's user ID
            document_type: Filter by document type
            start_date: Filter by start date
            end_date: Filter by end date
            limit: Maximum number of documents to return
            offset: Number of documents to skip

        Returns:
            Dictionary with documents and pagination info
        """
        query = (
            self.supabase.table(Tables.DOCUMENTS)
            .select("*", count="exact")
            .eq(Col.Documents.PATIENT_ID, patient_id)
        )

        if document_type:
            query = query.eq(Col.Documents.DOCUMENT_TYPE, document_type)

        if start_date:
            query = query.gte(Col.Documents.CREATED_AT, start_date)

        if end_date:
            query = query.lte(Col.Documents.CREATED_AT, end_date)

        query = query.order(Col.Documents.CREATED_AT, desc=True)
        query = query.range(offset, offset + limit - 1)

        response = query.execute()

        return {
            "documents": response.data if response.data else [],
            "total": response.count or 0,
            "has_more": (response.count or 0) > (offset + limit),
        }

    async def update_document(
        self, document_id: str, patient_id: str, update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update document metadata

        Args:
            document_id: Document ID
            patient_id: Patient's user ID (for authorization)
            update_data: Fields to update

        Returns:
            Updated document data
        """
        update_data[Col.Documents.UPDATED_AT] = datetime.now().isoformat()

        response = (
            self.supabase.table(Tables.DOCUMENTS)
            .update(update_data)
            .eq(Col.Documents.ID, document_id)
            .eq(Col.Documents.PATIENT_ID, patient_id)
            .execute()
        )

        if response.data:
            return response.data[0]

        raise Exception("Failed to update document")

    async def delete_document(self, document_id: str, patient_id: str) -> bool:
        """
        Delete a document

        Args:
            document_id: Document ID
            patient_id: Patient's user ID (for authorization)

        Returns:
            True if deleted successfully
        """
        # Get document to get file URL
        document = await self.get_document(document_id, patient_id)

        if not document:
            return False

        # Delete from storage
        file_url = document.get(Col.Documents.FILE_URL, "")
        if file_url:
            try:
                # Extract file path from URL
                file_path = file_url.split(f"{self.storage_bucket}/")[-1]

                self.supabase.storage.from_(self.storage_bucket).remove([file_path])
            except Exception:
                pass  # Continue even if storage deletion fails

        # Delete from database
        response = (
            self.supabase.table(Tables.DOCUMENTS)
            .delete()
            .eq(Col.Documents.ID, document_id)
            .eq(Col.Documents.PATIENT_ID, patient_id)
            .execute()
        )

        return bool(response.data)

    async def share_document(
        self, document_id: str, patient_id: str, doctor_id: str
    ) -> Dict[str, Any]:
        """
        Share document with a doctor

        Args:
            document_id: Document ID
            patient_id: Patient's user ID (for authorization)
            doctor_id: Doctor's user ID

        Returns:
            Updated document data
        """
        update_data = {
            Col.Documents.IS_SHARED: True,
            Col.Documents.SHARED_WITH_DOCTOR_ID: doctor_id,
            Col.Documents.SHARED_AT: datetime.now().isoformat(),
        }

        return await self.update_document(document_id, patient_id, update_data)

    async def unshare_document(
        self, document_id: str, patient_id: str
    ) -> Dict[str, Any]:
        """
        Unshare a document

        Args:
            document_id: Document ID
            patient_id: Patient's user ID (for authorization)

        Returns:
            Updated document data
        """
        update_data = {
            Col.Documents.IS_SHARED: False,
            Col.Documents.SHARED_WITH_DOCTOR_ID: None,
            Col.Documents.SHARED_AT: None,
        }

        return await self.update_document(document_id, patient_id, update_data)

    async def get_document_categories(self, patient_id: str) -> List[Dict[str, Any]]:
        """
        Get document categories with counts

        Args:
            patient_id: Patient's user ID

        Returns:
            List of categories with counts
        """
        # Get all documents
        response = (
            self.supabase.table(Tables.DOCUMENTS)
            .select(Col.Documents.DOCUMENT_TYPE)
            .eq(Col.Documents.PATIENT_ID, patient_id)
            .execute()
        )

        documents = response.data if response.data else []

        # Count by type
        type_counts = {}
        for doc in documents:
            doc_type = doc.get(Col.Documents.DOCUMENT_TYPE, "other")
            type_counts[doc_type] = type_counts.get(doc_type, 0) + 1

        # Define category metadata
        category_metadata = {
            "lab_result": {"label": "Lab Results", "icon": "🧪"},
            "insurance": {"label": "Insurance", "icon": "🏥"},
            "prescription": {"label": "Prescriptions", "icon": "💊"},
            "medical_history": {"label": "Medical History", "icon": "📋"},
            "imaging": {"label": "Imaging", "icon": "🔬"},
            "other": {"label": "Other", "icon": "📄"},
        }

        categories = []
        for doc_type, count in type_counts.items():
            metadata = category_metadata.get(
                doc_type, {"label": doc_type.title(), "icon": "📄"}
            )
            categories.append(
                {
                    "type": doc_type,
                    "label": metadata["label"],
                    "icon": metadata["icon"],
                    "count": count,
                }
            )

        return categories

    async def download_document(self, document_id: str, patient_id: str) -> bytes:
        """
        Download a document

        Args:
            document_id: Document ID
            patient_id: Patient's user ID (for authorization)

        Returns:
            Document file bytes
        """
        # Get document
        document = await self.get_document(document_id, patient_id)

        if not document:
            raise Exception("Document not found")

        # Get file from storage
        file_url = document.get(Col.Documents.FILE_URL, "")
        if not file_url:
            raise Exception("Document file not found")

        try:
            # Extract file path from URL
            file_path = file_url.split(f"{self.storage_bucket}/")[-1]

            file_data = self.supabase.storage.from_(self.storage_bucket).download(
                file_path
            )

            return file_data

        except Exception as e:
            raise Exception(f"Failed to download document: {str(e)}")

    async def get_storage_statistics(self, patient_id: str) -> Dict[str, Any]:
        """
        Get document storage statistics

        Args:
            patient_id: Patient's user ID

        Returns:
            Dictionary with storage statistics
        """
        # Get all documents
        response = (
            self.supabase.table(Tables.DOCUMENTS)
            .select("*")
            .eq(Col.Documents.PATIENT_ID, patient_id)
            .execute()
        )

        documents = response.data if response.data else []

        total_documents = len(documents)
        total_size_bytes = sum(
            doc.get(Col.Documents.FILE_SIZE, 0) or 0 for doc in documents
        )

        # Count by type
        documents_by_type = {}
        for doc in documents:
            doc_type = doc.get(Col.Documents.DOCUMENT_TYPE, "other")
            documents_by_type[doc_type] = documents_by_type.get(doc_type, 0) + 1

        # Storage limits (free tier: 1GB = 1,073,741,824 bytes)
        storage_limit_bytes = 1073741824
        storage_used_percentage = (
            (total_size_bytes / storage_limit_bytes * 100)
            if storage_limit_bytes > 0
            else 0
        )

        return {
            "total_documents": total_documents,
            "total_size_bytes": total_size_bytes,
            "storage_limit_bytes": storage_limit_bytes,
            "storage_used_percentage": round(storage_used_percentage, 2),
            "documents_by_type": documents_by_type,
        }


# Singleton instance
_document_service = None


def get_document_service() -> DocumentService:
    """Get or create document service instance"""
    global _document_service
    if _document_service is None:
        _document_service = DocumentService()
    return _document_service
