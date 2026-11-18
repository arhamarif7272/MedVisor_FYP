from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from backend.auth import get_current_patient
from backend.ingest import process_document
from backend.supabase_client import supabase_admin

router = APIRouter()

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(None),
    symptoms: str = Form(None),
    user: dict = Depends(get_current_patient)
):
    """Upload a file (PDF/Image) AND/OR submit symptoms text."""
    patient_id = user["id"]
    
    if not file and not symptoms:
        raise HTTPException(status_code=400, detail="Must provide a file or symptoms")

    results = []

    # 1. Handle File Upload (if provided)
    if file:
        file_bytes = await file.read()
        ext = file.filename.split(".")[-1].lower()
        file_type = "pdf" if ext == "pdf" else "image"
        
        res = process_document(
            patient_id=patient_id,
            filename=file.filename,
            file_bytes=file_bytes,
            file_type=file_type
        )
        results.append({"type": "file", "result": res})

    # 2. Handle Symptoms Text (if provided)
    if symptoms:
        res = process_document(
            patient_id=patient_id,
            filename="symptom_note.txt",
            file_bytes=b"",
            file_type="symptom_note",
            raw_text=symptoms
        )
        results.append({"type": "symptoms", "result": res})

    return {"message": "Data processed successfully", "details": results}