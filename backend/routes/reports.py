from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import base64
from backend.auth import get_current_patient
from backend.report import run_full_pipeline
from backend.supabase_client import supabase_admin

router = APIRouter()

class GenerateReportRequest(BaseModel):
    document_id: str
    patient_symptoms: str
    input_data: list[float] = None    # Optional (for Diabetes/Parkinsons)
    image_bytes_b64: str = None       # Optional (for MRI/Images)

@router.post("/generate")
def generate_report(body: GenerateReportRequest, user: dict = Depends(get_current_patient)):
    """
    Triggers the Agentic + Hybrid AI Pipeline.
    """
    # Decode image if provided
    input_data = body.input_data
    if body.image_bytes_b64:
        try:
            input_data = base64.b64decode(body.image_bytes_b64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid Base64 image data.")

    # Run the pipeline
    result = run_full_pipeline(
        patient_id=user["id"],
        document_id=body.document_id,
        patient_symptoms=body.patient_symptoms,
        input_data=input_data
    )
    
    # Handle Image Request
    if result.get("action_required") == "upload_image":
        return result # Returns a 200 OK with instructions for the frontend
        
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result

@router.get("/")
def get_my_reports(user: dict = Depends(get_current_patient)):
    """List all past reports."""
    res = supabase_admin.table("reports").select("id, disease_type, prediction_result, risk_level, created_at").eq("patient_id", user["id"]).order("created_at", desc=True).execute()
    return res.data

@router.get("/{report_id}")
def get_single_report(report_id: str, user: dict = Depends(get_current_patient)):
    """Get the full details of a single report."""
    res = supabase_admin.table("reports").select("*").eq("id", report_id).eq("patient_id", user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Report not found")
    return res.data[0]