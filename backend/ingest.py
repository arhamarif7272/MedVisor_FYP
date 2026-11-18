import io
import uuid
from pypdf import PdfReader
from google import genai
from google.genai import types
from backend.config import settings
from backend.supabase_client import supabase_admin

# Initialize Gemini Client
client = genai.Client(api_key=settings.GEMINI_API_KEY)

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from a PDF file."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    """Splits text into overlapping chunks."""
    if not text:
        return []
    
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def get_embedding(text: str) -> list[float]:
    """Calls Gemini to get a 768-dimensional embedding."""
    try:
        response = client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(
                output_dimensionality=settings.EMBEDDING_DIMENSION
            )
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"Gemini embedding error: {e}")
        return []

def process_document(patient_id: str, filename: str, file_bytes: bytes, file_type: str, raw_text: str = None) -> dict:
    """
    Main function to ingest a document.
    If file_type is 'symptom_note', it uses raw_text directly.
    Otherwise, it extracts text from the uploaded file.
    """
    # 1. Extract text
    if file_type == "symptom_note":
        extracted_text = raw_text or ""
    elif file_type == "pdf":
        extracted_text = extract_text_from_pdf(file_bytes)
    else:
        # For images (MRI, etc.), we would normally use OCR here.
        # For now, we'll just store a placeholder if no text.
        extracted_text = raw_text or "Image uploaded for analysis."

    if not extracted_text:
        return {"status": "error", "message": "No text could be extracted."}

    # 2. Save Document to DB
    doc_res = supabase_admin.table("documents").insert({
        "patient_id": patient_id,
        "filename": filename,
        "file_type": file_type,
        "raw_text": extracted_text
    }).execute()
    
    if not doc_res.data:
        return {"status": "error", "message": "Failed to save document metadata."}
    
    document_id = doc_res.data[0]['id']

    # 3. Chunk and Embed
    chunks = chunk_text(extracted_text)
    inserted_chunks = 0

    for chunk in chunks:
        if not chunk.strip():
            continue
        embedding = get_embedding(chunk)
        if embedding:
            supabase_admin.table("document_chunks").insert({
                "document_id": document_id,
                "patient_id": patient_id,
                "chunk_text": chunk,
                "embedding": embedding
            }).execute()
            inserted_chunks += 1

    return {
        "status": "success",
        "document_id": document_id,
        "chunks_created": inserted_chunks
    }