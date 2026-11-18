from fastapi import APIRouter, Depends, HTTPException
from backend.auth import get_current_patient
from backend.supabase_client import supabase_admin

router = APIRouter()

@router.get("/me")
def get_my_profile(user: dict = Depends(get_current_patient)):
    """Fetch the logged-in patient's profile."""
    res = supabase_admin.table("patients").select("*").eq("id", user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return res.data[0]

@router.put("/me")
def update_my_profile(update_data: dict, user: dict = Depends(get_current_patient)):
    """Update the patient's profile (e.g., phone, name)."""
    res = supabase_admin.table("patients").update(update_data).eq("id", user["id"]).execute()
    return res.data[0]