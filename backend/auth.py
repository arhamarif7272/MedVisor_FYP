"""
auth.py — FastAPI dependency to verify Supabase JWT tokens.
Every protected route uses `Depends(get_current_patient)`.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.supabase_client import supabase


security = HTTPBearer()


def get_current_patient(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Verifies the Bearer token against Supabase Auth.
    Returns:
        {"id": <uuid>, "email": <str>, "token": <str>}
    Raises 401 if token is invalid/expired.
    """
    token = credentials.credentials

    try:
        response = supabase.auth.get_user(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {e}",
        )

    if not response or not response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = response.user
    return {
        "id": user.id,
        "email": user.email or "",
        "token": token,
    }