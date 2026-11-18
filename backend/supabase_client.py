"""
supabase_client.py — Centralized Supabase client.
Provides:
  - `supabase`  : anon client (for user-scoped operations like verify JWT)
  - `supabase_admin` : service_role client (for backend operations
                       that bypass RLS, e.g. inserting chunks)
"""

from supabase import create_client, Client
from backend.config import settings


def _require(var_name: str, value: str) -> str:
    if not value:
        raise RuntimeError(
            f"[supabase_client] Missing env variable: {var_name}. "
            f"Check backend/.env"
        )
    return value


SUPABASE_URL = _require("SUPABASE_URL", settings.SUPABASE_URL)
SUPABASE_ANON_KEY = _require("SUPABASE_ANON_KEY", settings.SUPABASE_ANON_KEY)
SUPABASE_SERVICE_ROLE_KEY = _require(
    "SUPABASE_SERVICE_ROLE_KEY", settings.SUPABASE_SERVICE_ROLE_KEY
)

# Client used for auth verification (respects RLS)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Admin client — bypasses RLS. ONLY use in backend service code.
# NEVER expose this to the frontend.
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def health_check() -> dict:
    """Simple check used by /health endpoint."""
    try:
        supabase_admin.table("patients").select("id").limit(1).execute()
        return {"supabase": "ok"}
    except Exception as e:
        return {"supabase": f"error: {e}"}