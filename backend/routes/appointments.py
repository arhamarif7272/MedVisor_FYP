from fastapi import APIRouter, Depends
from pydantic import BaseModel
from backend.auth import get_current_patient
from backend.supabase_client import supabase_admin

router = APIRouter()

class AppointmentRequest(BaseModel):
    doctor_name: str
    scheduled_at: str
    reason: str = ""

@router.post("/")
def book_appointment(body: AppointmentRequest, user: dict = Depends(get_current_patient)):
    res = supabase_admin.table("appointments").insert({
        "patient_id": user["id"],
        "doctor_name": body.doctor_name,
        "scheduled_at": body.scheduled_at,
        "reason": body.reason
    }).execute()
    return res.data[0]

@router.get("/")
def get_my_appointments(user: dict = Depends(get_current_patient)):
    res = supabase_admin.table("appointments").select("*").eq("patient_id", user["id"]).order("scheduled_at").execute()
    return res.data