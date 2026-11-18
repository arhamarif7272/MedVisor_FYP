from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.supabase_client import health_check

# Import Routers
from backend.routes import patients, documents, reports, appointments

app = FastAPI(
    title="MedVisor v2 API",
    version="2.0.0",
    description="AI-powered healthcare platform — Patient Dashboard API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "dependencies": health_check()}

# Include Routers
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["Appointments"])