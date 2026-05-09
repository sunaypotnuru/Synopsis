from fastapi import APIRouter, Depends, Query, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore
import traceback
from app.core.security import get_current_user  # type: ignore
from app.services.supabase import supabase  # type: ignore

router = APIRouter(tags=["Semantic Search"])

_model = None


def _get_model():
    """
    Lazy-load the embedding model.
    This keeps the API bootable even when optional ML deps (torch/transformers)
    are unavailable in a given environment.
    """
    global _model
    if _model is not None:
        return _model
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Semantic search is unavailable (missing or broken sentence-transformers/torch stack): {e}",
        )
    _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


class SearchResponse(BaseModel):
    documents: list
    soap_notes: list


@router.get("/search/semantic", response_model=SearchResponse)
async def semantic_search(
    q: str = Query(..., description="Query text to search for"),
    user: dict = Depends(get_current_user),
):
    try:
        model = _get_model()
        # Generate embedding array from the user query
        embedding = model.encode(q).tolist()

        # Restrict semantic search to the logged-in patient
        patient_id = user["id"]

        docs_res = supabase.rpc(
            "match_documents",
            {
                "query_embedding": embedding,
                "match_count": 5,
                "filter_patient_id": patient_id,
            },
        ).execute()

        notes_res = supabase.rpc(
            "match_soap_notes",
            {
                "query_embedding": embedding,
                "match_count": 5,
                "filter_patient_id": patient_id,
            },
        ).execute()

        return {"documents": docs_res.data, "soap_notes": notes_res.data}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
