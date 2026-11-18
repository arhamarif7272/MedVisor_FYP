from google import genai
from google.genai import types
from backend.config import settings
from backend.supabase_client import supabase_admin

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def retrieve_context(patient_id: str, query: str, match_threshold: float = 0.5, match_count: int = 5) -> list[dict]:
    """
    Searches the patient's document chunks for context relevant to the query.
    """
    try:
        # 1. Embed the search query using Gemini
        response = client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=query,
            config=types.EmbedContentConfig(
                output_dimensionality=settings.EMBEDDING_DIMENSION
            )
        )
        query_embedding = response.embeddings[0].values
        
        # 2. Call the Supabase RPC function to do the vector similarity search
        # (We will create this RPC function in your Supabase SQL editor below)
        result = supabase_admin.rpc("match_document_chunks", {
            "query_embedding": query_embedding,
            "match_threshold": match_threshold,
            "match_count": match_count,
            "p_patient_id": patient_id
        }).execute()

        return result.data
    
    except Exception as e:
        print(f"RAG retrieval error: {e}")
        return []